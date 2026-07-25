import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ---------- Visitor tracking (called from the client on navigation) ---------- */
export const recordPageView = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ path: z.string().max(500), referrer: z.string().max(500).optional().nullable() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const { db } = await import("@/server/db");
      const { pageViews } = await import("@/server/db/schema");
      const { clientIp, deviceType, geoLookup } = await import("@/server/security");
      const { getSessionUser } = await import("@/server/auth/session");
      const req = getRequest();
      const ip = req ? clientIp(req) : "";
      const ua = req?.headers.get("user-agent") ?? null;
      const device = deviceType(ua);
      if (device === "bot") return { ok: true };
      const geo = await geoLookup(ip);
      const user = await getSessionUser().catch(() => null);
      await db.insert(pageViews).values({
        path: data.path.slice(0, 500),
        ip,
        userAgent: ua,
        referrer: data.referrer ? data.referrer.slice(0, 500) : null,
        device,
        country: geo.country ?? null,
        city: geo.city ?? null,
        userId: user?.id ?? null,
      });
    } catch {
      /* tracking must never break navigation */
    }
    return { ok: true };
  });

/* ---------- Rich analytics report ---------- */
export type AnalyticsReport = {
  range: number;
  revenue: number;
  revenuePrev: number;
  revenueGrowth: number;
  orders: number;
  ordersPrev: number;
  aov: number;
  paidRevenue: number;
  codRevenue: number;
  revenueSeries: { date: string; revenue: number; orders: number }[];
  statusBreakdown: Record<string, number>;
  paymentBreakdown: Record<string, number>;
  topProducts: { name: string; qty: number; revenue: number }[];
  topCustomers: { name: string; orders: number; spent: number }[];
  visits: number;
  uniqueVisitors: number;
  visitSeries: { date: string; visits: number }[];
  topPages: { path: string; views: number }[];
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  topReferrers: { referrer: string; count: number }[];
};

export const adminAnalytics = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(365).optional() }).parse(i ?? {}))
  .handler(async ({ data }): Promise<AnalyticsReport> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orders, pageViews } = await import("@/server/db/schema");
    const { gte } = await import("drizzle-orm");
    await requireStaff();

    const days = data.days ?? 30;
    const DAY = 86400000;
    const now = Date.now();
    const since = new Date(now - days * DAY);
    const prevSince = new Date(now - 2 * days * DAY);
    const paidLike = (s: string) => s !== "cancelled" && s !== "refunded";

    const allOrders = await db.select().from(orders).where(gte(orders.createdAt, prevSince));
    const views = await db.select().from(pageViews).where(gte(pageViews.createdAt, since));

    const seriesMap = new Map<string, { revenue: number; orders: number }>();
    const visitMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now - i * DAY).toISOString().slice(0, 10);
      seriesMap.set(d, { revenue: 0, orders: 0 });
      visitMap.set(d, 0);
    }

    let revenue = 0, revenuePrev = 0, orderCount = 0, ordersPrev = 0, paidRevenue = 0, codRevenue = 0;
    const statusBreakdown: Record<string, number> = {};
    const paymentBreakdown: Record<string, number> = {};
    const productAgg = new Map<string, { qty: number; revenue: number }>();
    const custAgg = new Map<string, { name: string; orders: number; spent: number }>();

    for (const o of allOrders) {
      const t = o.createdAt.getTime();
      const inCurrent = t >= since.getTime();
      if (paidLike(o.status)) {
        if (inCurrent) {
          revenue += o.total;
          orderCount += 1;
          if (o.paymentStatus === "paid") paidRevenue += o.total;
          if (o.paymentMethod === "cod") codRevenue += o.total;
          statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1;
          paymentBreakdown[o.paymentMethod] = (paymentBreakdown[o.paymentMethod] ?? 0) + 1;
          const key = o.createdAt.toISOString().slice(0, 10);
          const s = seriesMap.get(key);
          if (s) { s.revenue += o.total; s.orders += 1; }
          for (const it of o.items ?? []) {
            const p = productAgg.get(it.name) ?? { qty: 0, revenue: 0 };
            p.qty += it.qty; p.revenue += it.price * it.qty;
            productAgg.set(it.name, p);
          }
          const ck = o.userId ?? o.phone;
          const c = custAgg.get(ck) ?? { name: o.fullName, orders: 0, spent: 0 };
          c.orders += 1; c.spent += o.total;
          custAgg.set(ck, c);
        } else {
          revenuePrev += o.total;
          ordersPrev += 1;
        }
      }
    }

    let visits = 0;
    const uniq = new Set<string>();
    const pageAgg = new Map<string, number>();
    const deviceBreakdown: Record<string, number> = {};
    const countryBreakdown: Record<string, number> = {};
    const refAgg = new Map<string, number>();
    for (const v of views) {
      visits += 1;
      if (v.ip) uniq.add(v.ip);
      const key = v.createdAt.toISOString().slice(0, 10);
      if (visitMap.has(key)) visitMap.set(key, (visitMap.get(key) ?? 0) + 1);
      pageAgg.set(v.path, (pageAgg.get(v.path) ?? 0) + 1);
      if (v.device) deviceBreakdown[v.device] = (deviceBreakdown[v.device] ?? 0) + 1;
      if (v.country) countryBreakdown[v.country] = (countryBreakdown[v.country] ?? 0) + 1;
      if (v.referrer) refAgg.set(v.referrer, (refAgg.get(v.referrer) ?? 0) + 1);
    }

    const top = <T,>(m: Map<string, T>, val: (t: T) => number, take = 6) =>
      [...m.entries()].sort((a, b) => val(b[1]) - val(a[1])).slice(0, take);

    return {
      range: days,
      revenue,
      revenuePrev,
      revenueGrowth: revenuePrev > 0 ? Math.round(((revenue - revenuePrev) / revenuePrev) * 100) : revenue > 0 ? 100 : 0,
      orders: orderCount,
      ordersPrev,
      aov: orderCount ? Math.round(revenue / orderCount) : 0,
      paidRevenue,
      codRevenue,
      revenueSeries: [...seriesMap.entries()].map(([date, v]) => ({ date, revenue: v.revenue, orders: v.orders })),
      statusBreakdown,
      paymentBreakdown,
      topProducts: top(productAgg, (p) => p.revenue).map(([name, v]) => ({ name, qty: v.qty, revenue: v.revenue })),
      topCustomers: top(custAgg, (c) => c.spent).map(([, c]) => ({ name: c.name, orders: c.orders, spent: c.spent })),
      visits,
      uniqueVisitors: uniq.size,
      visitSeries: [...visitMap.entries()].map(([date, visits]) => ({ date, visits })),
      topPages: top(pageAgg, (n) => n).map(([path, views]) => ({ path, views })),
      deviceBreakdown,
      countryBreakdown,
      topReferrers: top(refAgg, (n) => n).map(([referrer, count]) => ({ referrer, count })),
    };
  });

/* ---------- Visitor log + IP bans ---------- */
export const adminListVisitors = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { pageViews } = await import("@/server/db/schema");
    const { desc } = await import("drizzle-orm");
    await requireStaff();
    const rows = await db.select().from(pageViews).orderBy(desc(pageViews.createdAt)).limit(data.limit ?? 100);
    return rows.map((v) => ({ id: v.id, path: v.path, ip: v.ip, device: v.device, country: v.country, city: v.city, referrer: v.referrer, userAgent: v.userAgent, createdAt: v.createdAt.toISOString() }));
  });

export const adminListBans = createServerFn({ method: "GET" }).handler(async () => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { bannedIps } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(bannedIps).orderBy(desc(bannedIps.createdAt));
  return rows.map((b) => ({ id: b.id, ip: b.ip, reason: b.reason, createdAt: b.createdAt.toISOString() }));
});

export const adminBanIp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ ip: z.string().trim().min(3).max(64), reason: z.string().max(200).optional() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { bannedIps } = await import("@/server/db/schema");
    const { invalidateBanCache } = await import("@/server/security");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await db.insert(bannedIps).values({ ip: data.ip, reason: data.reason ?? null, createdBy: actor.email }).onConflictDoNothing();
    invalidateBanCache();
    await audit(actor, "ip.ban", "ip", data.ip, { reason: data.reason });
    return { ok: true };
  });

export const adminUnbanIp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ ip: z.string().trim().min(3).max(64) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { bannedIps } = await import("@/server/db/schema");
    const { invalidateBanCache } = await import("@/server/security");
    const { eq } = await import("drizzle-orm");
    const actor = await requireManager();
    await db.delete(bannedIps).where(eq(bannedIps.ip, data.ip));
    invalidateBanCache();
    void actor;
    return { ok: true };
  });
