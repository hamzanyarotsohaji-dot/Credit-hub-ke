import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "node:crypto";
import { db, sessionsTable, usersTable, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "ch_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateReferralCode(): string {
  return "CH" + randomBytes(3).toString("hex").toUpperCase();
}

export async function createSession(
  userId: number,
  isAdmin: boolean,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({
    token,
    userId,
    isAdmin: isAdmin ? 1 : 0,
    expiresAt,
  });
  return { token, expiresAt };
}

export interface AuthUser {
  id: number;
  phone: string;
  name: string | null;
  balance: string;
  referralCode: string;
  createdAt: Date;
  isAdmin: boolean;
}

export async function loadUserFromToken(
  token: string | undefined,
): Promise<AuthUser | null> {
  if (!token) return null;
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.token, token))
    .limit(1);
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
    return null;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);
  if (!user) return null;

  let isAdmin = session.isAdmin === 1;
  if (!isAdmin) {
    const [adminMatch] = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.phone, user.phone))
      .limit(1);
    if (adminMatch) isAdmin = true;
  }

  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    balance: user.balance,
    referralCode: user.referralCode,
    createdAt: user.createdAt,
    isAdmin,
  };
}

export interface AuthRequest extends Request {
  authUser?: AuthUser;
}

export async function attachUser(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const cookies = (req as Request & { cookies?: Record<string, string> })
    .cookies;
  const token = cookies?.[SESSION_COOKIE];
  const user = await loadUserFromToken(token);
  if (user) req.authUser = user;
  next();
}

export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (!req.authUser.isAdmin) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function setSessionCookie(res: Response, token: string, expires: Date) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function userToResponse(u: AuthUser) {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    balance: Number(u.balance),
    referralCode: u.referralCode,
    createdAt: u.createdAt.toISOString(),
  };
}
