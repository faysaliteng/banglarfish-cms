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
  const base = (process.env.APP_URL || "").replace(/\/+$/, "");
  const t = await unsubscribeToken(email);
  return `${base}/unsubscribe?email=${encodeURIComponent(email)}&token=${t}`;
}
