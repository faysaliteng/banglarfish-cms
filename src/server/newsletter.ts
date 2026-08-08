// Signed unsubscribe tokens for newsletter emails (one-click, no login needed).
import { db } from "./db";
import { settings } from "./db/schema";
import { eq } from "drizzle-orm";

async function key(): Promise<string> {
  const [row] = await db.select().from(settings).where(eq(settings.key, "newsletterKey")).limit(1);
  const existing = (row?.value as { key?: string } | undefined)?.key;
  if (existing) return existing;
  const { randomBytes } = await import("node:crypto");
  const k = randomBytes(32).toString("hex");
  await db.insert(settings).values({ key: "newsletterKey", value: { key: k }, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: { key: k }, updatedAt: new Date() } });
  return k;
}

export async function unsubscribeToken(email: string): Promise<string> {
  const { createHmac } = await import("node:crypto");
  return createHmac("sha256", await key()).update(`unsub:${email.toLowerCase()}`).digest("hex").slice(0, 32);
}

// Absolute unsubscribe URL to embed in marketing emails.
export async function unsubscribeUrl(email: string): Promise<string> {
  const base = (process.env.APP_URL || "https://banglarfish.com").replace(/\/+$/, "");
  const t = await unsubscribeToken(email);
  return `${base}/unsubscribe?email=${encodeURIComponent(email)}&token=${t}`;
}

/**
 * Preference-centre URL — same signed token, different page. Offering this
 * alongside "unsubscribe" keeps people who only wanted fewer emails, rather
 * than losing them entirely because leaving was the only button.
 */
export async function preferencesUrl(email: string): Promise<string> {
  const base = (process.env.APP_URL || "https://banglarfish.com").replace(/\/+$/, "");
  const t = await unsubscribeToken(email);
  return `${base}/preferences?email=${encodeURIComponent(email)}&token=${t}`;
}

/** Constant-time-ish check that a link really was issued by us for this address. */
export async function verifyToken(email: string, token: string): Promise<boolean> {
  const expected = await unsubscribeToken(email);
  if (expected.length !== (token || "").length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
