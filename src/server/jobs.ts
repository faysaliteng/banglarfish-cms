// Durable job queue + recurring scheduler (kernel). DB-backed so jobs survive
// restarts; claimed with FOR UPDATE SKIP LOCKED so it's safe across processes.
// Retries with exponential backoff up to maxAttempts.
import { db } from "./db";
import { jobs } from "./db/schema";
import { and, eq, lte, sql } from "drizzle-orm";

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;
const g = globalThis as unknown as {
  __bfJobHandlers?: Map<string, JobHandler>;
  __bfWorkerStarted?: boolean;
  __bfSchedules?: { name: string; everyMs: number; last: number; run: () => Promise<void> }[];
};

function handlers(): Map<string, JobHandler> {
  return (g.__bfJobHandlers ??= new Map());
}

export function registerJob(type: string, fn: JobHandler): void {
  handlers().set(type, fn);
}

export async function enqueue(type: string, payload: Record<string, unknown> = {}, opts: { runAt?: Date; maxAttempts?: number } = {}): Promise<void> {
  try {
    await db.insert(jobs).values({ type, payload, runAt: opts.runAt ?? new Date(), maxAttempts: opts.maxAttempts ?? 5 });
  } catch (e) {
    console.error("[jobs] enqueue failed", type, e);
  }
}

// Claim and run up to `batch` due jobs.
async function drain(batch = 5): Promise<void> {
  const claimed = await db.execute(sql`
    UPDATE jobs SET status='running', attempts = attempts + 1, updated_at = now()
    WHERE id IN (
      SELECT id FROM jobs WHERE status='pending' AND run_at <= now()
      ORDER BY run_at ASC LIMIT ${batch} FOR UPDATE SKIP LOCKED
    ) RETURNING id, type, payload, attempts, max_attempts`);
  const rows = (claimed as unknown as { rows?: unknown[] }).rows ?? (claimed as unknown as unknown[]);
  for (const r of rows as { id: string; type: string; payload: Record<string, unknown>; attempts: number; max_attempts: number }[]) {
    const fn = handlers().get(r.type);
    if (!fn) {
      await db.update(jobs).set({ status: "failed", lastError: `No handler for "${r.type}"`, updatedAt: new Date() }).where(eq(jobs.id, r.id));
      continue;
    }
    try {
      await fn(r.payload ?? {});
      await db.update(jobs).set({ status: "done", updatedAt: new Date() }).where(eq(jobs.id, r.id));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (r.attempts >= r.max_attempts) {
        await db.update(jobs).set({ status: "failed", lastError: msg.slice(0, 500), updatedAt: new Date() }).where(eq(jobs.id, r.id));
      } else {
        const backoffMs = Math.min(60_000 * 2 ** (r.attempts - 1), 3_600_000); // exp backoff, cap 1h
        await db.update(jobs).set({ status: "pending", runAt: new Date(Date.now() + backoffMs), lastError: msg.slice(0, 500), updatedAt: new Date() }).where(eq(jobs.id, r.id));
      }
    }
  }
}

/* ---------------- Recurring scheduler ---------------- */
export function schedule(name: string, everyMs: number, run: () => Promise<void>): void {
  const s = (g.__bfSchedules ??= []);
  if (s.some((x) => x.name === name)) return;
  s.push({ name, everyMs, last: 0, run });
}

async function runSchedules(): Promise<void> {
  const now = Date.now();
  for (const s of g.__bfSchedules ?? []) {
    if (now - s.last < s.everyMs) continue;
    s.last = now;
    try { await s.run(); } catch (e) { console.error(`[schedule] ${s.name} failed`, e); }
  }
}

// Start the in-process worker loop + register default handlers/schedules. Idempotent.
export function startWorker(): void {
  if (g.__bfWorkerStarted) return;
  g.__bfWorkerStarted = true;
  registerDefaults();
  const loop = async () => {
    try { await drain(); } catch (e) { console.error("[jobs] drain error", e); }
    try { await runSchedules(); } catch { /* ignore */ }
  };
  setInterval(loop, 5000);
  setTimeout(loop, 2000);
  console.log("[kernel] job worker + scheduler started");
}

function registerDefaults(): void {
  // Core job handlers.
  registerJob("notify.sms", async (p) => {
    const { sendSms } = await import("./sms/boomcast");
    await sendSms(String(p.to), String(p.message));
  });
  registerJob("seo.indexnow", async (p) => {
    const { notifySearchEngines } = await import("./seo-ping");
    await notifySearchEngines(Array.isArray(p.paths) ? (p.paths as string[]) : []);
  });
  registerJob("newsletter.send", async (p) => {
    const { sendCampaign } = await import("./newsletter-send");
    await sendCampaign(String(p.campaignId));
  });

  registerJob("webhook.deliver", async (p) => {
    const { deliverWebhook } = await import("./webhooks");
    await deliverWebhook(String(p.endpointId), String(p.event), (p.data as Record<string, unknown>) ?? {});
  });

  // Abandoned-cart recovery: remind carts older than 1h that never converted (once each).
  schedule("abandoned.remind", 30 * 60 * 1000, async () => {
    const { abandonedCarts } = await import("./db/schema");
    const { and, isNull, lte } = await import("drizzle-orm");
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const rows = await db.select().from(abandonedCarts)
      .where(and(isNull(abandonedCarts.convertedAt), isNull(abandonedCarts.remindedAt), lte(abandonedCarts.createdAt, cutoff)))
      .limit(50);
    if (rows.length === 0) return;
    const { sendSms } = await import("./sms/boomcast");
    const { sendEmailSafe } = await import("./email");
    const { getEmailConfig, getBrandingConfig } = await import("./site-config");
    const emailCfg = await getEmailConfig().catch(() => null);
    let store = "Banglarfish";
    try { const b = await getBrandingConfig(); if (b?.storeName) store = b.storeName; } catch { /* default */ }
    const base = (process.env.APP_URL || "").replace(/\/+$/, "");
    for (const c of rows) {
      try {
        const first = (c.items ?? [])[0]?.name || "your items";
        if (c.phone) void sendSms(c.phone, `${store}: আপনি কি ${first} কার্টে রেখে গেছেন? অর্ডারটি সম্পন্ন করুন: ${base}/cart`);
        if (c.email && emailCfg?.enabled) {
          void sendEmailSafe({ to: c.email, subject: `Still thinking it over? Your ${store} cart is waiting`, html: `<p>Hi${c.name ? " " + c.name : ""}, you left ${first} (and more) in your cart. Complete your order here:</p><p><a href="${base}/cart" style="display:inline-block;background:#0ea5b7;color:#fff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:9px">Return to cart</a></p>` });
        }
        await db.update(abandonedCarts).set({ remindedAt: new Date() }).where(eq(abandonedCarts.id, c.id));
      } catch { /* skip this one */ }
    }
    console.log(`[abandoned] reminded ${rows.length} cart(s)`);
  });

  // Newsletter automation. The interval only decides how often we LOOK; whether
  // anything is actually sent is governed by DB watermarks inside runAnnouncements,
  // because schedule() keeps its "last run" in memory and would otherwise re-fire
  // — and re-send — on every process restart.
  schedule("newsletter.scan", 15 * 60 * 1000, async () => {
    const { runAnnouncements } = await import("./newsletter-send");
    await runAnnouncements();
  });

  // Recurring maintenance (query-time gating already handles scheduled publish).
  schedule("cleanup.sessions", 60 * 60 * 1000, async () => {
    const { sessions, otpCodes, jobs: jobsT } = await import("./db/schema");
    await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
    try { await db.delete(otpCodes).where(lte(otpCodes.expiresAt, new Date())); } catch { /* table shape */ }
    // Prune finished jobs older than 3 days.
    await db.delete(jobsT).where(and(eq(jobsT.status, "done"), lte(jobsT.updatedAt, new Date(Date.now() - 3 * 86400000))));
  });
}
