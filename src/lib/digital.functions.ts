import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type DigitalProduct = { id: string; name: string; slug: string; total: number; available: number };
export type MyKey = { productName: string; orderNumber: string; code: string; assignedAt: string | null };

export const adminDigitalProducts = createServerFn({ method: "GET" }).handler(async (): Promise<DigitalProduct[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { products, licenseKeys } = await import("@/server/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(products).where(eq(products.isDigital, true));
  const counts = await db.select({ pid: licenseKeys.productId, total: sql<number>`count(*)::int`, avail: sql<number>`count(*) FILTER (WHERE order_id IS NULL)::int` }).from(licenseKeys).groupBy(licenseKeys.productId);
  const byPid = new Map(counts.map((c) => [c.pid, c]));
  return rows.map((p) => ({ id: p.id, name: p.name, slug: p.slug, total: Number(byPid.get(p.id)?.total ?? 0), available: Number(byPid.get(p.id)?.avail ?? 0) }));
});

export const adminImportKeys = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ productId: z.string().uuid(), keys: z.string().max(200000) }).parse(i))
  .handler(async ({ data }): Promise<{ added: number }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { licenseKeys } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const codes = data.keys.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 20000);
    if (codes.length === 0) return { added: 0 };
    await db.insert(licenseKeys).values(codes.map((code) => ({ productId: data.productId, code })));
    await audit(actor, "keys.import", "product", data.productId, { count: codes.length });
    return { added: codes.length };
  });

export const listMyKeys = createServerFn({ method: "GET" }).handler(async (): Promise<MyKey[]> => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { licenseKeys, orders, products } = await import("@/server/db/schema");
  const { eq, and, isNotNull, desc } = await import("drizzle-orm");
  const user = await requireUser();
  const rows = await db
    .select({ code: licenseKeys.code, orderNumber: licenseKeys.orderNumber, assignedAt: licenseKeys.assignedAt, productName: products.name })
    .from(licenseKeys)
    .innerJoin(orders, eq(licenseKeys.orderId, orders.id))
    .innerJoin(products, eq(licenseKeys.productId, products.id))
    .where(and(eq(orders.userId, user.id), isNotNull(licenseKeys.orderId)))
    .orderBy(desc(licenseKeys.assignedAt));
  return rows.map((r) => ({ productName: r.productName, orderNumber: r.orderNumber ?? "", code: r.code, assignedAt: r.assignedAt?.toISOString() ?? null }));
});
