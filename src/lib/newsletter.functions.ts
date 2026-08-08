import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TOPIC = z.enum(["all", "products", "blog", "recipes", "offers", "digest"]);
const TOPICS_OBJ = z.object({
  products: z.boolean(), blog: z.boolean(), recipes: z.boolean(),
  offers: z.boolean(), digest: z.boolean(),
});

/* ------------------------------------------------------------------ *
 * Public — reached from a signed link in an email, no login
 * ------------------------------------------------------------------ */

/** Read the current topic choices behind a signed preferences link. */
export const getPreferences = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    email: z.string().trim().email().max(255),
    token: z.string().trim().max(120),
  }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; status?: string; topics?: z.infer<typeof TOPICS_OBJ> }> => {
    const { verifyToken } = await import("@/server/newsletter");
    if (!(await verifyToken(data.email.toLowerCase(), data.token))) return { ok: false };
    const { db } = await import("@/server/db");
    const { newsletterSubscribers } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, data.email.toLowerCase())).limit(1);
    if (!row) return { ok: false };
    const t = (row.topics ?? {}) as Partial<z.infer<typeof TOPICS_OBJ>>;
    return {
      ok: true,
      status: row.status,
      // Absent means opted-in: that is what they agreed to when they signed up,
      // before per-topic choices existed.
      topics: {
        products: t.products !== false, blog: t.blog !== false, recipes: t.recipes !== false,
        offers: t.offers !== false, digest: t.digest !== false,
      },
    };
  });

/** Save topic choices, and reactivate if they had previously opted out entirely. */
export const savePreferences = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    email: z.string().trim().email().max(255),
    token: z.string().trim().max(120),
    topics: TOPICS_OBJ,
  }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { verifyToken } = await import("@/server/newsletter");
    if (!(await verifyToken(data.email.toLowerCase(), data.token))) return { ok: false };
    const { db } = await import("@/server/db");
    const { newsletterSubscribers } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");

    // Turning every topic off is the same intent as unsubscribing — record it as
    // such, so the list count and the opt-out both stay honest.
    const any = Object.values(data.topics).some(Boolean);
    await db.update(newsletterSubscribers)
      .set({
        topics: data.topics,
        status: any ? "active" : "unsubscribed",
        unsubscribedAt: any ? null : new Date(),
      })
      .where(eq(newsletterSubscribers.email, data.email.toLowerCase()));
    return { ok: true };
  });

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export const adminNewsletterOverview = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireStaff } = await import("@/server/auth/context");
    await requireStaff();
    const { subscriberStats, campaignHistory, automationConfig } = await import("@/server/newsletter-send");
    const [stats, campaigns, automation] = await Promise.all([
      subscriberStats(), campaignHistory(40), automationConfig(),
    ]);
    return {
      stats,
      automation,
      campaigns: campaigns.map((c) => ({
        id: c.id, subject: c.subject, topic: c.topic, kind: c.kind, status: c.status,
        audience: c.audience, sent: c.sent, failed: c.failed, lastError: c.lastError,
        createdAt: c.createdAt?.toISOString() ?? "", sentAt: c.sentAt?.toISOString() ?? "",
      })),
    };
  });

/** Queue a broadcast. Returns immediately; the job queue does the sending. */
export const adminSendNewsletter = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    subject: z.string().trim().min(1).max(300),
    html: z.string().min(1).max(400_000),
    topic: TOPIC.default("all"),
  }).parse(i))
  .handler(async ({ data }): Promise<{ id: string; audience: number }> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { queueCampaign } = await import("@/server/newsletter-send");
    const res = await queueCampaign({ ...data, kind: "manual", createdBy: actor.id });
    try {
      const { audit } = await import("@/server/audit");
      await audit(actor, "newsletter.send", "newsletter", `${data.topic}: ${data.subject.slice(0, 60)}`);
    } catch { /* audit best-effort */ }
    return res;
  });

/** Send one copy to a single address so the sender can see it before the list does. */
export const adminTestNewsletter = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    to: z.string().trim().email().max(255),
    subject: z.string().trim().min(1).max(300),
    html: z.string().min(1).max(400_000),
  }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { sendEmail, wrapInBrandLayout } = await import("@/server/email");
    const { unsubscribeUrl, preferencesUrl } = await import("@/server/newsletter");
    const { fillTemplate } = await import("@/lib/email-templates");
    const body = fillTemplate(data.html, {
      customer_name: actor.fullName || "there",
      unsubscribe_url: await unsubscribeUrl(data.to),
      preferences_url: await preferencesUrl(data.to),
    });
    await sendEmail({
      to: data.to,
      subject: `[TEST] ${data.subject}`,
      html: await wrapInBrandLayout(body),
      category: "newsletter-test",
    });
    return { ok: true };
  });

/** Preview the weekly digest exactly as subscribers would get it, without sending. */
export const adminPreviewDigest = createServerFn({ method: "GET" })
  .handler(async (): Promise<{ subject: string; html: string; productCount: number }> => {
    const { requireStaff } = await import("@/server/auth/context");
    await requireStaff();
    const { activeProducts, productGridHtml } = await import("@/server/newsletter-send");
    const { getNewsletterTemplate } = await import("@/lib/newsletter-templates.data");
    const { fillTemplate } = await import("@/lib/email-templates");
    const items = await activeProducts(60);
    const tpl = getNewsletterTemplate("digest-weekly");
    if (!tpl) return { subject: "", html: "<p>The weekly digest template is missing.</p>", productCount: 0 };
    const categories = new Set(items.map((i) => i.categorySlug).filter(Boolean));
    const vars = {
      week_of: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      product_count: String(items.length),
      category_count: String(categories.size),
      product_grid: productGridHtml(items),
      store_name: "Banglarfish",
      shop_url: "/shop",
      unsubscribe_url: "#", preferences_url: "#", customer_name: "there",
    };
    return {
      subject: fillTemplate(tpl.subject, vars),
      html: fillTemplate(tpl.body, vars),
      productCount: items.length,
    };
  });

/** Send this week's digest now, regardless of the schedule. */
export const adminSendDigestNow = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ id: string; audience: number } | { id: null; audience: 0 }> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { buildWeeklyDigest } = await import("@/server/newsletter-send");
    const res = await buildWeeklyDigest();
    try {
      const { audit } = await import("@/server/audit");
      await audit(actor, "newsletter.digest", "newsletter", res ? `${res.audience} recipients` : "nothing in stock");
    } catch { /* audit best-effort */ }
    return res ?? { id: null, audience: 0 };
  });

export const adminSaveAutomation = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    products: z.boolean(), blog: z.boolean(), recipes: z.boolean(),
    priceDrops: z.boolean(), weeklyDigest: z.boolean(),
    digestDay: z.number().int().min(0).max(6),
    minPriceDropPercent: z.number().int().min(1).max(90),
  }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { db } = await import("@/server/db");
    const { settings } = await import("@/server/db/schema");
    const { primeWatermarks } = await import("@/server/newsletter-send");

    // Prime before enabling. Without this, switching on "new products" would
    // treat the entire existing catalogue as new and mail all of it at once.
    await primeWatermarks();
    await db.insert(settings).values({ key: "newsletterAutomation", value: data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value: data, updatedAt: new Date() } });
    try {
      const { audit } = await import("@/server/audit");
      await audit(actor, "newsletter.automation", "newsletter", JSON.stringify(data).slice(0, 120));
    } catch { /* audit best-effort */ }
    return { ok: true };
  });

/** Run the announcement scan immediately instead of waiting for the timer. */
export const adminRunAnnouncements = createServerFn({ method: "POST" })
  .handler(async (): Promise<{ ran: string[] }> => {
    const { requireManager } = await import("@/server/auth/context");
    await requireManager();
    const { runAnnouncements } = await import("@/server/newsletter-send");
    return runAnnouncements();
  });

/* ---------------- Subscriber management ---------------- */

export const adminSubscribers = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireStaff } = await import("@/server/auth/context");
    await requireStaff();
    const { db } = await import("@/server/db");
    const { newsletterSubscribers } = await import("@/server/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db.select().from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt)).limit(5000);
    return rows.map((r) => ({
      id: r.id, email: r.email, name: r.name, status: r.status,
      topics: r.topics as Record<string, boolean>, source: r.source,
      createdAt: r.createdAt?.toISOString() ?? "",
      lastSentAt: r.lastSentAt?.toISOString() ?? "",
    }));
  });

export const adminSetSubscriberStatus = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "unsubscribed"]),
  }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    await requireManager();
    const { db } = await import("@/server/db");
    const { newsletterSubscribers } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(newsletterSubscribers)
      .set({ status: data.status, unsubscribedAt: data.status === "unsubscribed" ? new Date() : null })
      .where(eq(newsletterSubscribers.id, data.id));
    return { ok: true };
  });

export const adminAddSubscribers = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    emails: z.string().max(200_000),
  }).parse(i))
  .handler(async ({ data }): Promise<{ added: number; skipped: number }> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { db } = await import("@/server/db");
    const { newsletterSubscribers } = await import("@/server/db/schema");

    const found = data.emails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
    const unique = [...new Set(found)];

    let added = 0;
    for (const email of unique) {
      const r = await db.insert(newsletterSubscribers)
        .values({ email, source: "admin" })
        .onConflictDoNothing()
        .returning({ id: newsletterSubscribers.id });
      if (r.length) added++;
    }
    try {
      const { audit } = await import("@/server/audit");
      await audit(actor, "newsletter.import", "newsletter", `${added} added`);
    } catch { /* audit best-effort */ }
    return { added, skipped: unique.length - added };
  });

export const adminDeleteSubscriber = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    await requireManager();
    const { db } = await import("@/server/db");
    const { newsletterSubscribers } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, data.id));
    return { ok: true };
  });
