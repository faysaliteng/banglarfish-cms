import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type MaintenanceState = { enabled: boolean; message: string };

export const adminGetMaintenance = createServerFn({ method: "GET" }).handler(async (): Promise<MaintenanceState> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { getMaintenance } = await import("@/server/site-config");
  await requireStaff();
  return getMaintenance();
});

export const adminSetMaintenance = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ enabled: z.boolean(), message: z.string().max(500).default("") }).parse(i))
  .handler(async ({ data }): Promise<MaintenanceState> => {
    const { requireManager } = await import("@/server/auth/context");
    const { getMaintenance, saveMaintenance } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const current = await getMaintenance();
    const next = { enabled: data.enabled, message: data.message || current.message };
    await saveMaintenance(next);
    await audit(actor, data.enabled ? "maintenance.on" : "maintenance.off", "settings", "maintenance");
    return next;
  });

export type AuditIntegrity = { ok: boolean; checked: number; brokenSeq?: number; reason?: string };

export const adminVerifyAuditChain = createServerFn({ method: "GET" }).handler(async (): Promise<AuditIntegrity> => {
  const { requireManager } = await import("@/server/auth/context");
  const { verifyAuditChain } = await import("@/server/audit");
  await requireManager();
  return verifyAuditChain();
});

export type HealthReport = {
  status: "ok" | "degraded";
  db: "up" | "down";
  latencyMs: number;
  uptimeS: number;
  node: string;
  memoryMB: { rss: number; heapUsed: number };
  jobs: Record<string, number>;
  counts: { products: number; orders: number; users: number };
  ts: string;
};

export const adminHealth = createServerFn({ method: "GET" }).handler(async (): Promise<HealthReport> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { sql } = await import("drizzle-orm");
  await requireStaff();

  const started = Date.now();
  let dbUp = false;
  try { await db.execute(sql`SELECT 1`); dbUp = true; } catch { dbUp = false; }
  const latencyMs = Date.now() - started;

  const jobs: Record<string, number> = {};
  const counts = { products: 0, orders: 0, users: 0 };
  try {
    const jq = await db.execute(sql`SELECT status, count(*)::int AS n FROM jobs GROUP BY status`);
    const jrows = ((jq as unknown as { rows?: { status: string; n: number }[] }).rows ?? (jq as unknown as { status: string; n: number }[])) ?? [];
    for (const r of jrows) jobs[r.status] = Number(r.n);
    const cq = await db.execute(sql`SELECT (SELECT count(*) FROM products)::int AS products, (SELECT count(*) FROM orders)::int AS orders, (SELECT count(*) FROM users)::int AS users`);
    const crow = ((cq as unknown as { rows?: Record<string, number>[] }).rows ?? (cq as unknown as Record<string, number>[]))?.[0];
    if (crow) { counts.products = Number(crow.products); counts.orders = Number(crow.orders); counts.users = Number(crow.users); }
  } catch { /* leave zeros */ }

  const mem = process.memoryUsage();
  return {
    status: dbUp ? "ok" : "degraded",
    db: dbUp ? "up" : "down",
    latencyMs,
    uptimeS: Math.round(process.uptime()),
    node: process.version,
    memoryMB: { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576) },
    jobs,
    counts,
    ts: new Date().toISOString(),
  };
});
