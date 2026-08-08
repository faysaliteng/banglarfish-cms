import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// GDPR / privacy toolkit: self-service data export + account erasure for the
// signed-in customer, plus admin tools to process requests by email.

type ExportBundle = {
  exportedAt: string;
  account: Record<string, unknown>;
  addresses: unknown[];
  orders: unknown[];
  reviews: unknown[];
  wishlist: unknown[];
  returns: unknown[];
  licenseKeys: unknown[];
};

async function buildExport(userId: string): Promise<ExportBundle> {
  const { db } = await import("@/server/db");
  const schema = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const [u] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  const account = u ? { id: u.id, email: u.email, phone: u.phone, fullName: u.fullName, role: u.role, customerGroup: u.customerGroup, phoneVerified: u.phoneVerified, emailVerified: u.emailVerified, createdAt: u.createdAt } : {};
  const addresses = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, userId));
  const orders = await db.select().from(schema.orders).where(eq(schema.orders.userId, userId));
  const reviews = await db.select().from(schema.reviews).where(eq(schema.reviews.userId, userId));
  const wishlist = await db.select().from(schema.wishlists).where(eq(schema.wishlists.userId, userId));
  const returns = await db.select().from(schema.returnRequests).where(eq(schema.returnRequests.userId, userId));
  const orderIds = orders.map((o) => o.id);
  let licenseKeys: unknown[] = [];
  if (orderIds.length) {
    const { inArray } = await import("drizzle-orm");
    licenseKeys = await db.select({ code: schema.licenseKeys.code, orderNumber: schema.licenseKeys.orderNumber, assignedAt: schema.licenseKeys.assignedAt }).from(schema.licenseKeys).where(inArray(schema.licenseKeys.orderId, orderIds));
  }
  return { exportedAt: new Date().toISOString(), account, addresses, orders, reviews, wishlist, returns, licenseKeys };
}

// Irreversibly scrub PII while preserving financial/referential integrity: orders
// are anonymized (kept for accounting), the account is locked + redacted, and all
// sessions/wishlist/addresses are removed.
async function eraseUser(userId: string): Promise<void> {
  const { db } = await import("@/server/db");
  const schema = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const { randomBytes, scryptSync } = await import("node:crypto");
  const anonEmail = `deleted-${userId.slice(0, 8)}@deleted.invalid`;
  const lockedHash = scryptSync(randomBytes(24).toString("hex"), randomBytes(16).toString("hex"), 64).toString("hex");
  // Anonymize order PII (retain totals/line items for records).
  await db.update(schema.orders).set({ fullName: "Deleted User", phone: "", email: null, addressLine1: "[erased]", addressLine2: null, city: "[erased]", district: null, postalCode: null, notes: null }).where(eq(schema.orders.userId, userId));
  // Scrub reviews author name.
  await db.update(schema.reviews).set({ customer: "Anonymous" }).where(eq(schema.reviews.userId, userId));
  // Remove directly-personal rows.
  await db.delete(schema.addresses).where(eq(schema.addresses.userId, userId));
  await db.delete(schema.wishlists).where(eq(schema.wishlists.userId, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  // Lock + redact the account (kept so orders keep a stable FK).
  await db.update(schema.users).set({ email: anonEmail, phone: "", fullName: "Deleted User", passwordHash: lockedHash, status: "blocked", customerGroup: "", updatedAt: new Date() }).where(eq(schema.users.id, userId));
}

export const exportMyData = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  const { requireUser } = await import("@/server/auth/context");
  const user = await requireUser();
  return JSON.stringify(await buildExport(user.id), null, 2);
});

export const deleteMyAccount = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(i))
  .handler(async (): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { audit } = await import("@/server/audit");
    const user = await requireUser();
    await audit(user, "account.erase", "user", user.id, { self: true });
    // Clear the session cookie first (reads the current cookie), then scrub.
    try { const { destroySession } = await import("@/server/auth/session"); await destroySession(); } catch { /* ignore */ }
    await eraseUser(user.id);
    return { ok: true };
  });

export const adminExportUserData = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().email() }).parse(i))
  .handler(async ({ data }): Promise<string> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const [u] = await db.select().from(users).where(eq(users.email, data.email.trim().toLowerCase())).limit(1);
    if (!u) throw new Error("No account with that email.");
    await audit(actor, "privacy.export", "user", u.id, { email: data.email });
    return JSON.stringify(await buildExport(u.id), null, 2);
  });

export const adminEraseUser = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().email(), confirm: z.literal("ERASE") }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const [u] = await db.select().from(users).where(eq(users.email, data.email.trim().toLowerCase())).limit(1);
    if (!u) throw new Error("No account with that email.");
    if (["admin", "manager"].includes(u.role)) throw new Error("Refusing to erase a staff account. Change its role first.");
    await eraseUser(u.id);
    await audit(actor, "privacy.erase", "user", u.id, { email: data.email });
    return { ok: true };
  });
