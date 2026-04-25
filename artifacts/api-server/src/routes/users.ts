import { Router, type IRouter, type Response } from "express";
import { eq } from "drizzle-orm";
import { UpdateMyProfileBody } from "@workspace/api-zod";
import { db, usersTable } from "@workspace/db";
import { attachUser, requireAuth, type AuthRequest } from "../lib/auth";

const router: IRouter = Router();

router.patch(
  "/users/me",
  attachUser,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = UpdateMyProfileBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const userId = req.authUser!.id;

    const updates: { name?: string } = {};
    if (typeof parsed.data.name === "string") {
      updates.name = parsed.data.name.trim().slice(0, 60);
    }

    if (Object.keys(updates).length > 0) {
      await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
    }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      balance: Number(user.balance),
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
    });
  },
);

export default router;
