import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type SalesReport = {
  totals: { revenue: number; orders: number; tax: number; discount: number; shipping: number; avgOrder: number; units: number };
  daily: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  coupons: { code: string; count: number; discount: number }[];
  payments: { method: string; count: number; revenue: number }[];
  statuses: { status: string; count: number }[];
};

export const adminSalesReport = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(730).default(30) }).parse(i))
  .handler(async ({ data }): Promise<SalesReport> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orders } = await import("@/server/db/schema");
    const { gte } = await import("drizzle-orm");
    await requireStaff();

    const since = new Date(Date.now() - data.days * 86400000);
    const rows = await db.select().from(orders).where(gte(orders.createdAt, since));
    const live = rows.filter((o) => o.status !== "cancelled");

    const totals = { revenue: 0, orders: live.length, tax: 0, discount: 0, shipping: 0, avgOrder: 0, units: 0 };
    const dailyMap = new Map<string, { revenue: number; orders: number }>();
    const prodMap = new Map<string, { qty: number; revenue: number }>();
    const couponMap = new Map<string, { count: number; discount: number }>();
    const payMap = new Map<string, { count: number; revenue: number }>();
    const statusMap = new Map<string, number>();

    for (const o of rows) statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);

    for (const o of live) {
      totals.revenue += o.total;
      totals.tax += o.tax ?? 0;
      totals.discount += o.discount ?? 0;
      totals.shipping += o.shipping ?? 0;
      const day = o.createdAt.toISOString().slice(0, 10);
      const d = dailyMap.get(day) ?? { revenue: 0, orders: 0 };
      d.revenue += o.total; d.orders += 1; dailyMap.set(day, d);
      const items = (o.items ?? []) as { name: string; qty: number; price: number }[];
      for (const it of items) {
        totals.units += it.qty;
        const p = prodMap.get(it.name) ?? { qty: 0, revenue: 0 };
        p.qty += it.qty; p.revenue += it.price * it.qty; prodMap.set(it.name, p);
      }
      if (o.couponCode) {
        const c = couponMap.get(o.couponCode) ?? { count: 0, discount: 0 };
        c.count += 1; c.discount += o.discount ?? 0; couponMap.set(o.couponCode, c);
      }
      const pm = payMap.get(o.paymentMethod) ?? { count: 0, revenue: 0 };
      pm.count += 1; pm.revenue += o.total; payMap.set(o.paymentMethod, pm);
    }
    totals.avgOrder = totals.orders ? Math.round(totals.revenue / totals.orders) : 0;

    // Fill every day in the range so the chart has no gaps.
    const daily: { date: string; revenue: number; orders: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const d = dailyMap.get(day) ?? { revenue: 0, orders: 0 };
      daily.push({ date: day, revenue: d.revenue, orders: d.orders });
    }

    return {
      totals,
      daily,
      topProducts: [...prodMap].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      coupons: [...couponMap].map(([code, v]) => ({ code, ...v })).sort((a, b) => b.count - a.count),
      payments: [...payMap].map(([method, v]) => ({ method, ...v })).sort((a, b) => b.revenue - a.revenue),
      statuses: [...statusMap].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
    };
  });

export type LowStockRow = { id: string; name: string; slug: string; stock: number; threshold: number; image: string };

export const adminLowStock = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ globalThreshold: z.number().int().min(0).max(100000).default(10) }).parse(i))
  .handler(async ({ data }): Promise<LowStockRow[]> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { products } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    const rows = await db.select().from(products).where(eq(products.active, true));
    const out: LowStockRow[] = [];
    for (const p of rows) {
      const threshold = (p as { lowStockThreshold?: number }).lowStockThreshold || data.globalThreshold;
      if (p.stock <= threshold) out.push({ id: p.id, name: p.name, slug: p.slug, stock: p.stock, threshold, image: p.image });
    }
    return out.sort((a, b) => a.stock - b.stock);
  });
