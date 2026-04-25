import { Router, type IRouter, type Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { GetTransactionParams } from "@workspace/api-zod";
import { db, transactionsTable, bundlesTable } from "@workspace/db";
import { attachUser, requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/transactions",
  attachUser,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.authUser!.id;
    const rows = await db
      .select({
        t: transactionsTable,
        bundle: bundlesTable,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(eq(transactionsTable.userId, userId))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(200);

    res.json(
      rows.map(({ t, bundle }) => ({
        id: t.id,
        bundleId: t.bundleId,
        bundleName: bundle?.name ?? "Bundle",
        bundleType: bundle?.type ?? "airtime",
        recipientPhone: t.recipientPhone,
        amount: Number(t.amount),
        status: t.status,
        mpesaCode: t.mpesaCode,
        createdAt: t.createdAt.toISOString(),
      })),
    );
  },
);

router.get(
  "/transactions/:id",
  attachUser,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = GetTransactionParams.safeParse({
      id: Number(req.params["id"]),
    });
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const id = parsed.data.id;
    const userId = req.authUser!.id;

    const [row] = await db
      .select({
        t: transactionsTable,
        bundle: bundlesTable,
      })
      .from(transactionsTable)
      .leftJoin(bundlesTable, eq(transactionsTable.bundleId, bundlesTable.id))
      .where(
        and(eq(transactionsTable.id, id), eq(transactionsTable.userId, userId)),
      )
      .limit(1);

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json({
      id: row.t.id,
      bundleId: row.t.bundleId,
      bundleName: row.bundle?.name ?? "Bundle",
      bundleType: row.bundle?.type ?? "airtime",
      recipientPhone: row.t.recipientPhone,
      amount: Number(row.t.amount),
      status: row.t.status,
      mpesaCode: row.t.mpesaCode,
      createdAt: row.t.createdAt.toISOString(),
    });
  },
);

export default router;
