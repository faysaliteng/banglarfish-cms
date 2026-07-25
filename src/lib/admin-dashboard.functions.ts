import { createServerFn } from "@tanstack/react-start";

export type DashboardData = {
  revenue: number;
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  ordersCount: number;
  customersCount: number;
  productsCount: number;
  ordersByStatus: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number }[];
  recentOrders: { id: string; order_number: string; full_name: string; total: number; status: string; created_at: string }[];
  revenueSeries: { date: string; revenue: number; orders: number }[];
};

export const adminDashboard = createServerFn({ method: "GET" }).handler(async (): Promise<DashboardData> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { orders, users, products } = await import("@/server/db/schema");
  const { desc, lt, eq, count } = await import("drizzle-orm");
  await requireStaff();

  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
  const [{ c: customersCount }] = await db.select({ c: count() }).from(users).where(eq(users.role, "customer"));
  const [{ c: productsCount }] = await db.select({ c: count() }).from(products);

  const now = Date.now();
  const DAY = 86400000;
  const paidLike = (s: string) => s !== "cancelled" && s !== "refunded";

  let revenue = 0, revenueToday = 0, revenueWeek = 0, revenueMonth = 0;
  const ordersByStatus: Record<string, number> = {};
  const productAgg = new Map<string, { qty: number; revenue: number }>();
  const seriesMap = new Map<string, { revenue: number; orders: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * DAY).toISOString().slice(0, 10);
    seriesMap.set(d, { revenue: 0, orders: 0 });
  }

  for (const o of allOrders) {
    ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
    const t = o.createdAt.getTime();
    if (paidLike(o.status)) {
      revenue += o.total;
      if (now - t < DAY) revenueToday += o.total;
      if (now - t < 7 * DAY) revenueWeek += o.total;
      if (now - t < 30 * DAY) revenueMonth += o.total;
      for (const it of o.items ?? []) {
        const cur = productAgg.get(it.name) ?? { qty: 0, revenue: 0 };
        cur.qty += it.qty;
        cur.revenue += it.price * it.qty;
        productAgg.set(it.name, cur);
      }
    }
    const dkey = o.createdAt.toISOString().slice(0, 10);
    const s = seriesMap.get(dkey);
    if (s && paidLike(o.status)) {
      s.revenue += o.total;
      s.orders += 1;
    }
  }

  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStockRows = await db.select({ id: products.id, name: products.name, stock: products.stock }).from(products).where(lt(products.stock, 10)).limit(10);

  return {
    revenue,
    revenueToday,
    revenueWeek,
    revenueMonth,
    ordersCount: allOrders.length,
    customersCount: Number(customersCount),
    productsCount: Number(productsCount),
    ordersByStatus,
    topProducts,
    lowStock: lowStockRows,
    recentOrders: allOrders.slice(0, 6).map((o) => ({ id: o.id, order_number: o.orderNumber, full_name: o.fullName, total: o.total, status: o.status, created_at: o.createdAt.toISOString() })),
    revenueSeries: [...seriesMap.entries()].map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders })),
  };
});
