import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type GiftCardRow = { id: string; code: string; initialBalance: number; balance: number; active: boolean; note: string | null; expiresAt: string | null; createdAt: string };

const normCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

// Public: check a code's usable balance (for the checkout UI).
export const checkGiftCard = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ code: z.string().trim().min(1).max(40) }).parse(i))
  .handler(async ({ data }): Promise<{ valid: boolean; balance: number }> => {
    const { db } = await import("@/server/db");
    const { giftCards } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const [gc] = await db.select().from(giftCards).where(eq(giftCards.code, normCode(data.code))).limit(1);
    if (!gc || !gc.active || gc.balance <= 0) return { valid: false, balance: 0 };
    if (gc.expiresAt && gc.expiresAt.getTime() < Date.now()) return { valid: false, balance: 0 };
    return { valid: true, balance: gc.balance };
  });

export const adminListGiftCards = createServerFn({ method: "GET" }).handler(async (): Promise<GiftCardRow[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { giftCards } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(giftCards).orderBy(desc(giftCards.createdAt));
  return rows.map((g) => ({ id: g.id, code: g.code, initialBalance: g.initialBalance, balance: g.balance, active: g.active, note: g.note, expiresAt: g.expiresAt?.toISOString() ?? null, createdAt: g.createdAt.toISOString() }));
});

export const adminCreateGiftCard = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().trim().max(40).optional(), amount: z.number().int().positive().max(100000000), note: z.string().max(200).optional(), expiresAt: z.string().optional().nullable() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; code: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { giftCards } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    let code = data.code ? normCode(data.code) : "";
    if (!code) {
      // Generate GIFT-XXXX-XXXX.
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      code = `GIFT-${rand(4)}-${rand(4)}`;
    }
    const exp = data.expiresAt ? new Date(data.expiresAt) : null;
    await db.insert(giftCards).values({ code, initialBalance: data.amount, balance: data.amount, active: true, note: data.note ?? null, expiresAt: exp && !isNaN(exp.getTime()) ? exp : null });
    await audit(actor, "giftcard.create", "giftcard", code, { amount: data.amount });
    return { ok: true, code };
  });

export const adminUpdateGiftCard = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), active: z.boolean().optional(), balance: z.number().int().nonnegative().optional() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { giftCards } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    const patch: Record<string, unknown> = {};
    if (data.active !== undefined) patch.active = data.active;
    if (data.balance !== undefined) patch.balance = data.balance;
    if (Object.keys(patch).length) await db.update(giftCards).set(patch).where(eq(giftCards.id, data.id));
    return { ok: true };
  });

export const adminDeleteGiftCard = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { giftCards } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.delete(giftCards).where(eq(giftCards.id, data.id));
    return { ok: true };
  });
