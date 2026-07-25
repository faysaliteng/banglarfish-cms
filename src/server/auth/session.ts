// Opaque cookie sessions backed by the `sessions` table.
// The cookie holds a random token; only its SHA-256 hash is stored server-side.
import { createHash, randomBytes } from "node:crypto";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { sessions, users } from "@/server/db/schema";

const COOKIE = "bf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = typeof users.$inferSelect;

// Insert a session row and return the raw token (does NOT set the cookie).
export async function createSessionRecord(userId: string, meta?: { ip?: string; ua?: string }): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  await db.insert(sessions).values({ id, userId, expiresAt, ip: meta?.ip, userAgent: meta?.ua });
  return { token, expiresAt };
}

// Set-Cookie header string — for raw Response objects (e.g. OAuth redirects).
export function sessionCookieString(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS};${secure}`;
}

export async function createSession(userId: string): Promise<string> {
  let ip: string | undefined;
  let ua: string | undefined;
  try {
    const req = getRequest();
    ip = req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;
    ua = req?.headers.get("user-agent") ?? undefined;
  } catch {
    /* not in a request context */
  }
  const { token } = await createSessionRecord(userId, { ip, ua });
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = getCookie(COOKIE);
  if (!token) return null;
  const id = hashToken(token);
  const [s] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!s) return null;
  if (s.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  const [u] = await db.select().from(users).where(eq(users.id, s.userId)).limit(1);
  if (!u || u.status === "blocked") return null;
  return u;
}

export async function destroySession(): Promise<void> {
  const token = getCookie(COOKIE);
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  deleteCookie(COOKIE, { path: "/" });
}
