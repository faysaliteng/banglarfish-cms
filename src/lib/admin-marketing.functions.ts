import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Coupon, ShippingZone } from "./types";

/* ---------- Coupons ---------- */
export const adminListCoupons = createServerFn({ method: "GET" }).handler(async (): Promise<Coupon[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { coupons } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return rows.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    minSubtotal: c.minSubtotal,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : null,
    active: c.active,
    usage: c.usage,
    limit: c.usageLimit,
  }));
});

const CouponInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1).max(40),
  type: z.enum(["percent", "fixed"]),
  value: z.number().int().nonnegative(),
  minSubtotal: z.number().int().nonnegative(),
  expiresAt: z.string().optional().nullable(),
  active: z.boolean(),
  limit: z.number().int().nonnegative(),
});

export const adminUpsertCoupon = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CouponInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { coupons } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const user = await requireStaff();
    const values = {
      code: data.code.toUpperCase(),
      type: data.type,
      value: data.value,
      minSubtotal: data.minSubtotal,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      active: data.active,
      usageLimit: data.limit,
    };
    let id: string;
    if (data.id) {
      await db.update(coupons).set(values).where(eq(coupons.id, data.id));
      id = data.id;
    } else {
      const [row] = await db.insert(coupons).values(values).returning({ id: coupons.id });
      id = row.id;
    }
    await audit(user, data.id ? "coupon.update" : "coupon.create", "coupon", id, { code: data.code });
    return { id };
  });

export const adminDeleteCoupon = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { coupons } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(coupons).where(eq(coupons.id, data.id));
    return { ok: true };
  });

/* ---------- Shipping zones ---------- */
export const adminListZones = createServerFn({ method: "GET" }).handler(async (): Promise<ShippingZone[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { shippingZones } = await import("@/server/db/schema");
  const { asc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(shippingZones).orderBy(asc(shippingZones.sort));
  return rows.map((z) => ({ id: z.id, name: z.name, cities: z.cities, rate: z.rate, freeAbove: z.freeAbove, eta: z.eta, active: z.active }));
});

const ZoneInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  cities: z.array(z.string()).default([]),
  rate: z.number().int().nonnegative(),
  freeAbove: z.number().int().nonnegative(),
  eta: z.string().trim().max(60).default(""),
  active: z.boolean(),
});

export const adminUpsertZone = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ZoneInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { shippingZones } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    const values = { name: data.name, cities: data.cities, rate: data.rate, freeAbove: data.freeAbove, eta: data.eta, active: data.active };
    let id: string;
    if (data.id) {
      await db.update(shippingZones).set(values).where(eq(shippingZones.id, data.id));
      id = data.id;
    } else {
      const [row] = await db.insert(shippingZones).values(values).returning({ id: shippingZones.id });
      id = row.id;
    }
    return { id };
  });

export const adminDeleteZone = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { shippingZones } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(shippingZones).where(eq(shippingZones.id, data.id));
    return { ok: true };
  });
