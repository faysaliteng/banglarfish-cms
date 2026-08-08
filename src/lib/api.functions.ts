import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ApiKeyRow = { id: string; name: string; prefix: string; scopes: string[]; active: boolean; lastUsedAt: string | null; createdAt: string };
export type WebhookRow = { id: string; url: string; events: string[]; active: boolean; secret: string; createdAt: string };
export type DeliveryRow = { id: string; endpointId: string; event: string; status: string; responseCode: number | null; createdAt: string };

export const API_SCOPE_LIST = ["read:products", "write:products", "read:orders", "write:orders", "read:content", "write:content", "read:customers"];
export const WEBHOOK_EVENT_LIST = ["order.created", "order.paid", "order.status", "content.published", "review.created", "customer.registered"];

/* ---------------- API keys ---------------- */
export const adminListApiKeys = createServerFn({ method: "GET" }).handler(async (): Promise<ApiKeyRow[]> => {
  const { requireManager } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { apiKeys } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireManager();
  const rows = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  return rows.map((k) => ({ id: k.id, name: k.name, prefix: k.prefix, scopes: k.scopes ?? [], active: k.active, lastUsedAt: k.lastUsedAt?.toISOString() ?? null, createdAt: k.createdAt.toISOString() }));
});

export const adminCreateApiKey = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ name: z.string().trim().min(1).max(80), scopes: z.array(z.string().max(40)).min(1) }).parse(i))
  .handler(async ({ data }): Promise<{ id: string; key: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { apiKeys } = await import("@/server/db/schema");
    const { randomBytes, createHash } = await import("node:crypto");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const raw = `bf_live_${randomBytes(24).toString("hex")}`;
    const keyHash = createHash("sha256").update(raw).digest("hex");
    const prefix = raw.slice(0, 16) + "…";
    const [row] = await db.insert(apiKeys).values({ name: data.name, prefix, keyHash, scopes: data.scopes }).returning({ id: apiKeys.id });
    await audit(actor, "apikey.create", "apikey", row.id, { name: data.name, scopes: data.scopes });
    return { id: row.id, key: raw }; // shown once
  });

export const adminRevokeApiKey = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { apiKeys } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.delete(apiKeys).where(eq(apiKeys.id, data.id));
    return { ok: true };
  });

/* ---------------- Webhooks ---------------- */
export const adminListWebhooks = createServerFn({ method: "GET" }).handler(async (): Promise<{ hooks: WebhookRow[]; deliveries: DeliveryRow[] }> => {
  const { requireManager } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { webhookEndpoints, webhookDeliveries } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireManager();
  const hooks = await db.select().from(webhookEndpoints).orderBy(desc(webhookEndpoints.createdAt));
  const deliveries = await db.select().from(webhookDeliveries).orderBy(desc(webhookDeliveries.createdAt)).limit(50);
  return {
    hooks: hooks.map((h) => ({ id: h.id, url: h.url, events: h.events ?? [], active: h.active, secret: h.secret, createdAt: h.createdAt.toISOString() })),
    deliveries: deliveries.map((d) => ({ id: d.id, endpointId: d.endpointId, event: d.event, status: d.status, responseCode: d.responseCode, createdAt: d.createdAt.toISOString() })),
  };
});

export const adminCreateWebhook = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ url: z.string().url().max(600), events: z.array(z.string().max(60)).min(1) }).parse(i))
  .handler(async ({ data }): Promise<{ id: string; secret: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { webhookEndpoints } = await import("@/server/db/schema");
    const { randomBytes } = await import("node:crypto");
    await requireManager();
    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    const [row] = await db.insert(webhookEndpoints).values({ url: data.url, events: data.events, secret }).returning({ id: webhookEndpoints.id });
    return { id: row.id, secret };
  });

export const adminDeleteWebhook = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { webhookEndpoints } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.delete(webhookEndpoints).where(eq(webhookEndpoints.id, data.id));
    return { ok: true };
  });
