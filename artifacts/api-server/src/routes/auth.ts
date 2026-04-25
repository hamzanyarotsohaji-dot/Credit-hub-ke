import { Router, type IRouter, type Response } from "express";
import { eq, desc, lt } from "drizzle-orm";
import {
  RequestOtpBody,
  VerifyOtpBody,
} from "@workspace/api-zod";
import {
  db,
  otpsTable,
  usersTable,
  sessionsTable,
} from "@workspace/db";
import { normalizeKenyanPhone } from "../lib/phone";
import {
  attachUser,
  clearSessionCookie,
  createSession,
  generateReferralCode,
  setSessionCookie,
  userToResponse,
  type AuthRequest,
} from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/request-otp", async (req, res) => {
  const parsed = RequestOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid phone" });
    return;
  }
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Invalid Kenyan phone number" });
    return;
  }

  const code = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.insert(otpsTable).values({ phone, code, expiresAt });

  req.log.info({ phone, code }, "OTP generated");

  // In dev (or when no SMS provider), return the OTP for easy testing.
  const inDev = process.env.NODE_ENV !== "production";
  res.json({
    success: true,
    devOtp: inDev ? code : null,
  });
});

router.post("/auth/verify-otp", async (req, res) => {
  const parsed = VerifyOtpBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const phone = normalizeKenyanPhone(parsed.data.phone);
  if (!phone) {
    res.status(400).json({ error: "Invalid phone" });
    return;
  }
  const code = parsed.data.code.trim();

  const [otp] = await db
    .select()
    .from(otpsTable)
    .where(eq(otpsTable.phone, phone))
    .orderBy(desc(otpsTable.createdAt))
    .limit(1);

  if (!otp || otp.code !== code || otp.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "Invalid or expired OTP" });
    return;
  }

  // Consume the OTP
  await db.delete(otpsTable).where(eq(otpsTable.phone, phone));

  // Find or create user
  let [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.phone, phone))
    .limit(1);

  if (!user) {
    const referralCode = generateReferralCode();
    const inserted = await db
      .insert(usersTable)
      .values({
        phone,
        referralCode,
      })
      .returning();
    user = inserted[0]!;
  }

  const { token, expiresAt } = await createSession(user.id, false);
  setSessionCookie(res, token, expiresAt);

  res.json({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      balance: Number(user.balance),
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

router.get("/auth/me", attachUser, async (req: AuthRequest, res: Response) => {
  if (!req.authUser) {
    res.json({ user: null });
    return;
  }
  res.json({ user: userToResponse(req.authUser) });
});

router.post("/auth/logout", async (req, res) => {
  const cookies = (req as AuthRequest & { cookies?: Record<string, string> })
    .cookies;
  const token = cookies?.["ch_session"];
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

// Cleanup of expired OTPs every once in a while
setInterval(
  () => {
    db.delete(otpsTable)
      .where(lt(otpsTable.expiresAt, new Date()))
      .catch(() => {
        /* ignore */
      });
  },
  10 * 60 * 1000,
);

export default router;
