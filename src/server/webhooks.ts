// Outbound webhooks: HMAC-signed POST with a delivery log, driven off the event bus
// through the durable job queue (retries handled by the queue).
import { createHmac } from "node:crypto";

// Deliver a single event to one endpoint and record the result. Throwing lets the
// job queue retry with backoff.
export async function deliverWebhook(endpointId: string, event: string, data: Record<string, unknown>): Promise<void> {
  const { db } = await import("./db");
  const { webhookEndpoints, webhookDeliveries } = await import("./db/schema");
  const { eq } = await import("drizzle-orm");
  const [ep] = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.id, endpointId)).limit(1);
  if (!ep || !ep.active) return;

  const bodyObj = { event, data, timestamp: new Date().toISOString() };
  const body = JSON.stringify(bodyObj);
  const signature = createHmac("sha256", ep.secret).update(body).digest("hex");
  let status = "failed";
  let code: number | null = null;
  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-bf-event": event, "x-bf-signature": `sha256=${signature}` },
      body,
      signal: AbortSignal.timeout(10000),
    });
    code = res.status;
    status = res.ok ? "success" : "failed";
  } catch {
    status = "failed";
  }
  await db.insert(webhookDeliveries).values({ endpointId, event, status, responseCode: code, attempts: 1 }).catch(() => {});
  if (status !== "success") throw new Error(`Webhook delivery failed (${code ?? "no response"})`);
}

// Find endpoints subscribed to an event and enqueue a delivery job for each.
export async function dispatchWebhooks(event: string, data: Record<string, unknown>): Promise<void> {
  try {
    const { db } = await import("./db");
    const { webhookEndpoints } = await import("./db/schema");
    const { eq } = await import("drizzle-orm");
    const { enqueue } = await import("./jobs");
    const eps = await db.select().from(webhookEndpoints).where(eq(webhookEndpoints.active, true));
    for (const ep of eps) {
      if (!(ep.events ?? []).includes(event) && !(ep.events ?? []).includes("*")) continue;
      await enqueue("webhook.deliver", { endpointId: ep.id, event, data });
    }
  } catch (e) {
    console.error("[webhooks] dispatch failed", e);
  }
}

// Subscribe core events -> webhook dispatch. Idempotent.
const g = globalThis as unknown as { __bfWebhooksWired?: boolean };
export async function wireWebhooks(): Promise<void> {
  if (g.__bfWebhooksWired) return;
  g.__bfWebhooksWired = true;
  const { on } = await import("./events");
  const events = ["order.created", "order.paid", "order.status", "content.published", "review.created", "customer.registered"];
  for (const ev of events) {
    on(ev, async (payload) => { await dispatchWebhooks(ev, (payload as Record<string, unknown>) ?? {}); });
  }
}
