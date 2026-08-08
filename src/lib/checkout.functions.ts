import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Capture a checkout-in-progress for abandoned-cart recovery. Public + best-effort;
// called from the checkout page once a contact (phone/email) is entered.
export const captureCheckout = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      name: z.string().trim().max(120).optional().default(""),
      phone: z.string().trim().max(20).optional().default(""),
      email: z.string().trim().max(255).optional().default(""),
      subtotal: z.number().int().nonnegative().default(0),
      items: z.array(z.object({ name: z.string().max(200), qty: z.number().int().positive().max(999), price: z.number().int().nonnegative() })).max(100).default([]),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      const phone = data.phone.trim();
      const email = data.email.toLowerCase().trim();
      if ((!phone && !email) || data.items.length === 0) return { ok: true };
      const { db } = await import("@/server/db");
      const { abandonedCarts } = await import("@/server/db/schema");
      const { and, or, eq, isNull, desc } = await import("drizzle-orm");

      // Reuse the latest still-pending cart for this contact instead of piling up rows.
      const match = phone && email ? or(eq(abandonedCarts.phone, phone), eq(abandonedCarts.email, email))
        : phone ? eq(abandonedCarts.phone, phone) : eq(abandonedCarts.email, email);
      const [existing] = await db.select({ id: abandonedCarts.id }).from(abandonedCarts)
        .where(and(match, isNull(abandonedCarts.convertedAt))).orderBy(desc(abandonedCarts.createdAt)).limit(1);

      const values = { name: data.name, phone, email, items: data.items, subtotal: data.subtotal, updatedAt: new Date() };
      if (existing) await db.update(abandonedCarts).set(values).where(eq(abandonedCarts.id, existing.id));
      else await db.insert(abandonedCarts).values(values);
    } catch { /* best-effort; never disrupt checkout */ }
    return { ok: true };
  });
