import { Router, type IRouter } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db, bundlesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/bundles", async (req, res) => {
  const typeRaw = String(req.query["type"] ?? "all").toLowerCase();
  const allowed = ["airtime", "data", "sms", "all"];
  const type = allowed.includes(typeRaw) ? typeRaw : "all";

  const where =
    type === "all"
      ? eq(bundlesTable.active, true)
      : and(eq(bundlesTable.active, true), eq(bundlesTable.type, type));

  const rows = await db
    .select()
    .from(bundlesTable)
    .where(where)
    .orderBy(asc(bundlesTable.type), asc(bundlesTable.sellingPrice));

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
});

export default router;
