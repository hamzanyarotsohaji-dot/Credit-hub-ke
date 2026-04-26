import { Router, type IRouter, type Response } from "express";
import { eq, desc, and, gte, sql, count } from "drizzle-orm";
import {
  AdminCreateBundleBody,
  AdminUpdateBundleBody,
  AdminUpdateBundleParams,
  AdminDeleteBundleParams,
  AdminListTransactionsQueryParams,
} from "@workspace/api-zod";
import {
  db,
  bundlesTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { attachUser, requireAdmin, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.use(attachUser);

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

router.get(
  "/admin/dashboard",
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    const today = startOfTodayUtc();

    const [salesTodayAgg] = await db
      .select({
        cnt: sql<number>`COUNT(*)::int`,
        amount: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`,
      })
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.status, "paid"),
          gte(transactionsTable.createdAt, today),
        ),
      );

    const [profitTodayAgg] = await db
      .select({
        profit: sql<string>`COALESCE(SUM(${transactionsTable.amount} - ${bundlesTable.costPrice}), 0)::text`,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(
        and(
          eq(transactionsTable.status, "paid"),
          gte(transactionsTable.createdAt, today),
        ),
      );

    const [usersAgg] = await db
      .select({ cnt: count() })
      .from(usersTable);

    const [usersTodayAgg] = await db
      .select({ cnt: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, today));

    const [pendingAgg] = await db
      .select({ cnt: count() })
      .from(transactionsTable)
      .where(eq(transactionsTable.status, "pending"));

    const [paidAgg] = await db
      .select({ cnt: count() })
      .from(transactionsTable)
      .where(eq(transactionsTable.status, "paid"));

    const salesByTypeRows = await db
      .select({
        type: bundlesTable.type,
        cnt: sql<number>`COUNT(*)::int`,
        amount: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(
        and(
          eq(transactionsTable.status, "paid"),
          gte(transactionsTable.createdAt, today),
        ),
      )
      .groupBy(bundlesTable.type);

    const recentRows = await db
      .select({
        t: transactionsTable,
        bundle: bundlesTable,
        user: usersTable,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    res.json({
      salesTodayCount: Number(salesTodayAgg?.cnt ?? 0),
      salesTodayAmount: Number(salesTodayAgg?.amount ?? 0),
      profitToday: Number(profitTodayAgg?.profit ?? 0),
      totalUsers: Number(usersAgg?.cnt ?? 0),
      newUsersToday: Number(usersTodayAgg?.cnt ?? 0),
      pendingCount: Number(pendingAgg?.cnt ?? 0),
      paidCount: Number(paidAgg?.cnt ?? 0),
      salesByType: salesByTypeRows.map((r) => ({
        type: r.type ?? "unknown",
        count: Number(r.cnt ?? 0),
        amount: Number(r.amount ?? 0),
      })),
      recentTransactions: recentRows.map(({ t, bundle, user }) => ({
        id: t.id,
        bundleId: t.bundleId,
        bundleName: bundle?.name ?? "Bundle",
        bundleType: bundle?.type ?? "airtime",
        recipientPhone: t.recipientPhone,
        amount: Number(t.amount),
        status: t.status,
        mpesaCode: t.mpesaCode,
        createdAt: t.createdAt.toISOString(),
        userPhone: user?.phone ?? "",
        userName: user?.name ?? null,
      })),
    });
  },
);

router.get(
  "/admin/sales-report",
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const dateParam = typeof req.query["date"] === "string" ? req.query["date"] : "";
    const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? new Date(dateParam + "T00:00:00.000Z") : null;
    const start = parsedDate ?? startOfTodayUtc();
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const dateLabel = start.toISOString().slice(0, 10);

    const successful = and(
      sql`${transactionsTable.status} IN ('paid','completed')`,
      gte(transactionsTable.createdAt, start),
      sql`${transactionsTable.createdAt} < ${end}`,
    );
    const inDay = and(
      gte(transactionsTable.createdAt, start),
      sql`${transactionsTable.createdAt} < ${end}`,
    );

    const [totals] = await db
      .select({
        revenue: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`,
        profit: sql<string>`COALESCE(SUM(${transactionsTable.amount} - ${bundlesTable.costPrice}), 0)::text`,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(successful);

    const statusRows = await db
      .select({
        status: transactionsTable.status,
        cnt: sql<number>`COUNT(*)::int`,
      })
      .from(transactionsTable)
      .where(inDay)
      .groupBy(transactionsTable.status);
    const statusCount = (s: string) => Number(statusRows.find((r) => r.status === s)?.cnt ?? 0);

    const byTypeRows = await db
      .select({
        type: bundlesTable.type,
        cnt: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`,
        profit: sql<string>`COALESCE(SUM(${transactionsTable.amount} - ${bundlesTable.costPrice}), 0)::text`,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(successful)
      .groupBy(bundlesTable.type);

    const byHourRows = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${transactionsTable.createdAt})::int`,
        cnt: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`,
      })
      .from(transactionsTable)
      .where(successful)
      .groupBy(sql`EXTRACT(HOUR FROM ${transactionsTable.createdAt})`);
    const hourMap = new Map(byHourRows.map((r) => [Number(r.hour), r]));
    const byHour = Array.from({ length: 24 }, (_, h) => {
      const r = hourMap.get(h);
      return {
        hour: h,
        count: r ? Number(r.cnt) : 0,
        revenue: r ? Number(r.revenue) : 0,
      };
    });

    const topRows = await db
      .select({
        bundleId: transactionsTable.bundleId,
        name: bundlesTable.name,
        type: bundlesTable.type,
        cnt: sql<number>`COUNT(*)::int`,
        revenue: sql<string>`COALESCE(SUM(${transactionsTable.amount}), 0)::text`,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(successful)
      .groupBy(transactionsTable.bundleId, bundlesTable.name, bundlesTable.type)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(5);

    const failureRows = await db
      .select({
        t: transactionsTable,
        bundle: bundlesTable,
        user: usersTable,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .where(and(eq(transactionsTable.status, "failed"), inDay))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    res.json({
      date: dateLabel,
      revenue: Number(totals?.revenue ?? 0),
      profit: Number(totals?.profit ?? 0),
      transactionCount: Number(totals?.cnt ?? 0),
      completedCount: statusCount("completed"),
      paidCount: statusCount("paid"),
      failedCount: statusCount("failed"),
      pendingCount: statusCount("pending"),
      byType: byTypeRows.map((r) => ({
        type: r.type ?? "unknown",
        count: Number(r.cnt ?? 0),
        revenue: Number(r.revenue ?? 0),
        profit: Number(r.profit ?? 0),
      })),
      byHour,
      topBundles: topRows.map((r) => ({
        bundleId: r.bundleId,
        name: r.name ?? "Bundle",
        type: r.type ?? "unknown",
        count: Number(r.cnt ?? 0),
        revenue: Number(r.revenue ?? 0),
      })),
      recentFailures: failureRows.map(({ t, bundle, user }) => ({
        id: t.id,
        bundleId: t.bundleId,
        bundleName: bundle?.name ?? "Bundle",
        bundleType: bundle?.type ?? "airtime",
        recipientPhone: t.recipientPhone,
        amount: Number(t.amount),
        status: t.status,
        mpesaCode: t.mpesaCode,
        createdAt: t.createdAt.toISOString(),
        userPhone: user?.phone ?? "",
        userName: user?.name ?? null,
      })),
    });
  },
);

router.get(
  "/admin/transactions",
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const parsed = AdminListTransactionsQueryParams.safeParse({
      status: req.query["status"],
    });
    const status = parsed.success ? (parsed.data.status ?? "all") : "all";

    const where =
      status && status !== "all"
        ? eq(transactionsTable.status, status)
        : undefined;

    const rows = await db
      .select({
        t: transactionsTable,
        bundle: bundlesTable,
        user: usersTable,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .leftJoin(usersTable, eq(transactionsTable.userId, usersTable.id))
      .where(where)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(500);

    res.json(
      rows.map(({ t, bundle, user }) => ({
        id: t.id,
        bundleId: t.bundleId,
        bundleName: bundle?.name ?? "Bundle",
        bundleType: bundle?.type ?? "airtime",
        recipientPhone: t.recipientPhone,
        amount: Number(t.amount),
        status: t.status,
        mpesaCode: t.mpesaCode,
        createdAt: t.createdAt.toISOString(),
        userPhone: user?.phone ?? "",
        userName: user?.name ?? null,
      })),
    );
  },
);

router.get(
  "/admin/users",
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select({
        u: usersTable,
        spent: sql<string>`COALESCE(SUM(CASE WHEN ${transactionsTable.status} = 'paid' THEN ${transactionsTable.amount} ELSE 0 END), 0)::text`,
        cnt: sql<number>`COUNT(${transactionsTable.id})::int`,
      })
      .from(usersTable)
      .leftJoin(
        transactionsTable,
        eq(transactionsTable.userId, usersTable.id),
      )
      .groupBy(usersTable.id)
      .orderBy(desc(usersTable.createdAt));

    res.json(
      rows.map(({ u, spent, cnt }) => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        balance: Number(u.balance),
        referralCode: u.referralCode,
        createdAt: u.createdAt.toISOString(),
        totalSpent: Number(spent ?? 0),
        transactionCount: Number(cnt ?? 0),
      })),
    );
  },
);

router.get(
  "/admin/bundles",
  requireAdmin,
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(bundlesTable)
      .orderBy(bundlesTable.type, bundlesTable.sellingPrice);
    res.json(
      rows.map((b) => ({
        id: b.id,
        name: b.name,
        type: b.type,
        amount: b.amount,
        sellingPrice: Number(b.sellingPrice),
        costPrice: Number(b.costPrice),
        active: b.active,
        validity: b.validity,
      })),
    );
  },
);

router.post(
  "/admin/bundles",
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const parsed = AdminCreateBundleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const data = parsed.data;
    const inserted = await db
      .insert(bundlesTable)
      .values({
        name: data.name,
        type: data.type,
        amount: data.amount,
        sellingPrice: String(data.sellingPrice),
        costPrice: String(data.costPrice),
        validity: data.validity ?? null,
        active: data.active ?? true,
      })
      .returning();
    const b = inserted[0]!;
    res.json({
      id: b.id,
      name: b.name,
      type: b.type,
      amount: b.amount,
      sellingPrice: Number(b.sellingPrice),
      costPrice: Number(b.costPrice),
      active: b.active,
      validity: b.validity,
    });
  },
);

router.patch(
  "/admin/bundles/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const params = AdminUpdateBundleParams.safeParse({
      id: Number(req.params["id"]),
    });
    const body = AdminUpdateBundleBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const updates: Record<string, unknown> = {};
    const d = body.data;
    if (d.name !== undefined) updates["name"] = d.name;
    if (d.type !== undefined) updates["type"] = d.type;
    if (d.amount !== undefined) updates["amount"] = d.amount;
    if (d.sellingPrice !== undefined)
      updates["sellingPrice"] = String(d.sellingPrice);
    if (d.costPrice !== undefined) updates["costPrice"] = String(d.costPrice);
    if (d.validity !== undefined) updates["validity"] = d.validity;
    if (d.active !== undefined) updates["active"] = d.active;

    if (Object.keys(updates).length > 0) {
      await db
        .update(bundlesTable)
        .set(updates)
        .where(eq(bundlesTable.id, params.data.id));
    }

    const [b] = await db
      .select()
      .from(bundlesTable)
      .where(eq(bundlesTable.id, params.data.id))
      .limit(1);
    if (!b) {
      res.status(404).json({ error: "Bundle not found" });
      return;
    }
    res.json({
      id: b.id,
      name: b.name,
      type: b.type,
      amount: b.amount,
      sellingPrice: Number(b.sellingPrice),
      costPrice: Number(b.costPrice),
      active: b.active,
      validity: b.validity,
    });
  },
);

router.delete(
  "/admin/bundles/:id",
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    const params = AdminDeleteBundleParams.safeParse({
      id: Number(req.params["id"]),
    });
    if (!params.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(bundlesTable).where(eq(bundlesTable.id, params.data.id));
    res.json({ success: true });
  },
);

export default router;
