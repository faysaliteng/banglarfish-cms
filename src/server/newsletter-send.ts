/**
 * Newsletter delivery: audience selection, batched sending, and the HTML blocks
 * the templates leave for the server to fill (the product grid, the item list).
 *
 * Sending is deliberately slow and sequential-ish. A self-hosted Postfix on a
 * single VPS will start deferring if you open a hundred concurrent connections,
 * and a deferred newsletter looks exactly like a spam run to the receiving side.
 * Small batches with a pause between them keep the sending reputation intact.
 */
import { db } from "./db";
import { newsletterSubscribers, newsletterCampaigns, products, blogPosts } from "./db/schema";
import type { NewsletterTopics } from "./db/schema";
import { eq, desc } from "drizzle-orm";

export type Topic = keyof NewsletterTopics | "all";

const BATCH_SIZE = 20;
const BATCH_PAUSE_MS = 1500;

/* ------------------------------------------------------------------ *
 * Audience
 * ------------------------------------------------------------------ */

export type Recipient = { id: string; email: string; name: string };

/**
 * Everyone who should receive a send on this topic.
 *
 * Topic filtering is done in JS rather than SQL on purpose: rows created before
 * the topics column existed get the column default, but a row written by an
 * older code path could still carry a partial object. Treating "absent" as
 * opted-in matches what those people agreed to when they signed up, while an
 * explicit false always wins.
 */
export async function audience(topic: Topic): Promise<Recipient[]> {
  const rows = await db
    .select({
      id: newsletterSubscribers.id,
      email: newsletterSubscribers.email,
      name: newsletterSubscribers.name,
      topics: newsletterSubscribers.topics,
    })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "active"));

  return rows
    .filter((r) => topic === "all" || (r.topics as Partial<NewsletterTopics> | null)?.[topic] !== false)
    .map((r) => ({ id: r.id, email: r.email, name: r.name || "" }));
}

export async function audienceCount(topic: Topic): Promise<number> {
  return (await audience(topic)).length;
}

/* ------------------------------------------------------------------ *
 * Sending
 * ------------------------------------------------------------------ */

/**
 * Send a campaign to its audience.
 *
 * Per-recipient personalisation happens here, not in the template: every send
 * gets its own signed unsubscribe and preferences link. A shared link would let
 * one recipient unsubscribe someone else.
 */
export async function sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
  const [c] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, campaignId)).limit(1);
  if (!c) throw new Error("Campaign not found");
  if (c.status === "sending") throw new Error("That campaign is already sending");
  if (c.status === "sent") throw new Error("That campaign has already been sent");

  const list = await audience(c.topic as Topic);
  await db.update(newsletterCampaigns)
    .set({ status: "sending", audience: list.length, sent: 0, failed: 0, lastError: "" })
    .where(eq(newsletterCampaigns.id, campaignId));

  const { sendEmail, wrapInBrandLayout } = await import("./email");
  const { unsubscribeUrl, preferencesUrl } = await import("./newsletter");
  const { fillTemplate } = await import("@/lib/email-templates");

  let sent = 0, failed = 0, lastError = "";

  for (let i = 0; i < list.length; i += BATCH_SIZE) {
    const batch = list.slice(i, i + BATCH_SIZE);
    for (const r of batch) {
      try {
        const body = fillTemplate(c.html, {
          customer_name: r.name || "there",
          unsubscribe_url: await unsubscribeUrl(r.email),
          preferences_url: await preferencesUrl(r.email),
        });
        await sendEmail({
          to: r.email,
          subject: fillTemplate(c.subject, { customer_name: r.name || "there" }),
          html: await wrapInBrandLayout(body),
          category: "newsletter",
          // One-click unsubscribe. Gmail and Yahoo require this on bulk mail;
          // without it a list this size gets throttled or spam-foldered.
          headers: {
            "List-Unsubscribe": `<${await unsubscribeUrl(r.email)}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sent++;
        await db.update(newsletterSubscribers)
          .set({ lastSentAt: new Date() })
          .where(eq(newsletterSubscribers.id, r.id));
      } catch (e) {
        failed++;
        lastError = e instanceof Error ? e.message : String(e);
        console.error("[newsletter] send failed", r.email, lastError);
      }
    }
    await db.update(newsletterCampaigns)
      .set({ sent, failed, lastError: lastError.slice(0, 500) })
      .where(eq(newsletterCampaigns.id, campaignId));
    if (i + BATCH_SIZE < list.length) await new Promise((res) => setTimeout(res, BATCH_PAUSE_MS));
  }

  await db.update(newsletterCampaigns)
    .set({
      status: failed > 0 && sent === 0 ? "failed" : "sent",
      sent, failed, sentAt: new Date(), lastError: lastError.slice(0, 500),
    })
    .where(eq(newsletterCampaigns.id, campaignId));

  console.log(`[newsletter] campaign ${campaignId}: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Create a campaign row and hand it to the job queue so the request returns fast.
 *
 * Refuses anything still carrying a {{placeholder}}. fillTemplate deliberately
 * leaves unknown keys in place so a half-filled template is visible rather than
 * silently blanked — which means this is the last line of defence before a whole
 * subscriber list receives an email reading "Hi {{customer_name}}".
 * customer_name, unsubscribe_url and preferences_url are the exception: those
 * are filled per recipient at send time, not here.
 */
const PER_RECIPIENT_VARS = new Set(["customer_name", "unsubscribe_url", "preferences_url"]);

export async function queueCampaign(input: {
  subject: string; html: string; topic: Topic; kind?: string; createdBy?: string | null;
}): Promise<{ id: string; audience: number }> {
  const { unfilledVariables } = await import("@/lib/email-templates");
  const leftover = unfilledVariables(input.subject, input.html).filter((v) => !PER_RECIPIENT_VARS.has(v));
  if (leftover.length) {
    throw new Error(`Not sent — these are still unfilled: ${leftover.map((v) => `{{${v}}}`).join(", ")}`);
  }

  const list = await audience(input.topic);
  const [row] = await db.insert(newsletterCampaigns).values({
    subject: input.subject,
    html: input.html,
    topic: input.topic,
    kind: input.kind ?? "manual",
    status: "draft",
    audience: list.length,
    createdBy: input.createdBy ?? null,
  }).returning({ id: newsletterCampaigns.id });

  const { enqueue } = await import("./jobs");
  await enqueue("newsletter.send", { campaignId: row.id }, { maxAttempts: 1 });
  return { id: row.id, audience: list.length };
}

/* ------------------------------------------------------------------ *
 * Server-rendered blocks injected into templates
 * ------------------------------------------------------------------ */

const ACCENT = "#0ea5b7";

function esc(s: string): string {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function money(n: number): string {
  return `৳${Number(n || 0).toLocaleString("en-US")}`;
}

function appUrl(): string {
  return (process.env.APP_URL || "https://banglarfish.com").replace(/\/+$/, "");
}

function absolute(u: string): string {
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `${appUrl()}${u.startsWith("/") ? "" : "/"}${u}`;
}

/**
 * A two-column product grid as nested tables.
 *
 * Tables rather than flex because Outlook renders on Word's engine, which has no
 * flexbox at all. Two columns rather than three because a third column pushes
 * each cell under ~180px, where the product name wraps to three lines on a phone.
 */
export function productGridHtml(
  items: { name: string; slug: string; price: number; image: string; unit?: string }[],
): string {
  if (!items.length) return "";
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const pair = items.slice(i, i + 2);
    const cells = pair.map((p) => {
      const url = `${appUrl()}/product/${encodeURIComponent(p.slug)}`;
      const img = absolute(p.image);
      return `<td width="50%" style="width:50%;padding:6px;vertical-align:top">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e2e8f0;border-radius:8px">
    <tr><td style="padding:0">
      <a href="${url}" style="text-decoration:none;color:inherit">
        ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" width="260" style="width:100%;max-width:100%;height:auto;display:block;border-radius:8px 8px 0 0;border:0" />` : ""}
      </a>
    </td></tr>
    <tr><td style="padding:10px 12px 12px">
      <a href="${url}" style="text-decoration:none;color:#0f172a;font-size:14px;font-weight:600;line-height:1.35;display:block">${esc(p.name)}</a>
      <div style="margin-top:4px;color:${ACCENT};font-size:15px;font-weight:700">${money(p.price)}${p.unit ? `<span style="color:#64748b;font-size:12px;font-weight:400"> / ${esc(p.unit)}</span>` : ""}</div>
    </td></tr>
  </table>
</td>`;
    }).join("");
    // Pad the final odd row so the last card keeps its column width.
    const filler = pair.length === 1 ? '<td width="50%" style="width:50%">&nbsp;</td>' : "";
    rows.push(`<tr>${cells}${filler}</tr>`);
  }
  return `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;margin:18px 0">${rows.join("")}</table>`;
}

/** A simple linked list block — new posts, new recipes, price drops. */
export function itemListHtml(
  items: { title: string; url: string; image?: string; note?: string }[],
): string {
  if (!items.length) return "";
  const rows = items.map((it) => {
    const img = absolute(it.image || "");
    return `<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%">
    <tr>
      ${img ? `<td width="80" style="width:80px;padding-right:12px;vertical-align:top"><a href="${esc(it.url)}"><img src="${esc(img)}" alt="${esc(it.title)}" width="80" style="width:80px;height:auto;display:block;border-radius:6px;border:0" /></a></td>` : ""}
      <td style="vertical-align:top">
        <a href="${esc(it.url)}" style="color:#0f172a;font-size:15px;font-weight:600;text-decoration:none;line-height:1.4">${esc(it.title)}</a>
        ${it.note ? `<div style="margin-top:3px;color:#64748b;font-size:13px;line-height:1.5">${esc(it.note)}</div>` : ""}
      </td>
    </tr>
  </table>
</td></tr>`;
  }).join("");
  return `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:16px 0">${rows}</table>`;
}

/* ------------------------------------------------------------------ *
 * The weekly digest
 * ------------------------------------------------------------------ */

export async function activeProducts(limit = 60): Promise<{ name: string; slug: string; price: number; image: string; unit: string; categorySlug: string }[]> {
  const rows = await db
    .select({
      name: products.name, slug: products.slug, price: products.price,
      image: products.image, unit: products.unit, categorySlug: products.categorySlug,
      stock: products.stock, active: products.active,
    })
    .from(products)
    .orderBy(desc(products.createdAt))
    .limit(400);
  return rows
    .filter((p) => p.active !== false && (p.stock ?? 0) !== 0)
    .slice(0, limit)
    .map((p) => ({
      name: p.name, slug: p.slug, price: p.price,
      image: p.image || "", unit: p.unit || "", categorySlug: p.categorySlug || "",
    }));
}

/** Build and queue this week's catalogue email. Returns null when there is nothing to send. */
export async function buildWeeklyDigest(): Promise<{ id: string; audience: number } | null> {
  const items = await activeProducts(60);
  // Nothing in stock: stay quiet. An automated "we have nothing" email is worse
  // than silence, and digest-empty-week needs details only a human can supply.
  if (!items.length) return null;

  const { getNewsletterTemplate } = await import("@/lib/newsletter-templates.data");
  const { fillTemplate } = await import("@/lib/email-templates");
  const tpl = getNewsletterTemplate("digest-weekly");
  if (!tpl) {
    console.error("[newsletter] weekly digest template missing");
    return null;
  }

  const categories = new Set(items.map((i) => i.categorySlug).filter(Boolean));
  const weekOf = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const vars = {
    week_of: weekOf,
    product_count: String(items.length),
    category_count: String(categories.size),
    product_grid: productGridHtml(items),
    store_name: "Banglarfish",
    shop_url: `${appUrl()}/shop`,
  };

  return queueCampaign({
    subject: fillTemplate(tpl.subject, vars),
    html: fillTemplate(tpl.body, vars),
    topic: "digest",
    kind: "digest",
  });
}

/* ------------------------------------------------------------------ *
 * Automated announcements
 *
 * Watermark-driven rather than hooked into every save: an edit to a published
 * post would otherwise re-announce it, and a draft flipped to published and back
 * would announce twice. A watermark answers one question — "what became visible
 * since we last looked" — which is exactly what should be announced.
 * ------------------------------------------------------------------ */

type Watermarks = {
  products?: string;
  blog?: string;
  recipes?: string;
  weeklyDigest?: string;
  prices?: Record<string, number>;
};

async function readWatermarks(): Promise<Watermarks> {
  const { settings } = await import("./db/schema");
  const [row] = await db.select().from(settings).where(eq(settings.key, "newsletterWatermarks")).limit(1);
  return (row?.value as Watermarks | undefined) ?? {};
}

async function writeWatermarks(patch: Watermarks): Promise<void> {
  const { settings } = await import("./db/schema");
  const current = await readWatermarks();
  const value = { ...current, ...patch };
  await db.insert(settings).values({ key: "newsletterWatermarks", value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
}

/** Read the admin's automation switches. Everything is off until turned on. */
export async function automationConfig(): Promise<{
  products: boolean; blog: boolean; recipes: boolean; priceDrops: boolean;
  weeklyDigest: boolean; digestDay: number; minPriceDropPercent: number;
}> {
  const { settings } = await import("./db/schema");
  const [row] = await db.select().from(settings).where(eq(settings.key, "newsletterAutomation")).limit(1);
  const v = (row?.value ?? {}) as Record<string, unknown>;
  return {
    products: v.products === true,
    blog: v.blog === true,
    recipes: v.recipes === true,
    priceDrops: v.priceDrops === true,
    weeklyDigest: v.weeklyDigest === true,
    digestDay: typeof v.digestDay === "number" ? v.digestDay : 5, // 0=Sun … 5=Fri
    minPriceDropPercent: typeof v.minPriceDropPercent === "number" ? v.minPriceDropPercent : 5,
  };
}

async function announce(templateId: string, topic: Topic, items: { title: string; url: string; image?: string; note?: string }[]): Promise<void> {
  if (!items.length) return;
  const { getNewsletterTemplate } = await import("@/lib/newsletter-templates.data");
  const { fillTemplate } = await import("@/lib/email-templates");
  const tpl = getNewsletterTemplate(templateId);
  if (!tpl) { console.error(`[newsletter] template ${templateId} missing`); return; }
  const vars = {
    item_list: itemListHtml(items),
    item_count: String(items.length),
    store_name: "Banglarfish",
    shop_url: `${appUrl()}/shop`,
  };
  await queueCampaign({
    subject: fillTemplate(tpl.subject, vars),
    html: fillTemplate(tpl.body, vars),
    topic,
    kind: "announce",
  });
}

/**
 * The scan. Runs on a timer; every branch is guarded by its own watermark, so a
 * restart re-reads where it got to instead of re-announcing the world.
 */
export async function runAnnouncements(): Promise<{ ran: string[] }> {
  const cfg = await automationConfig();
  const wm = await readWatermarks();
  const ran: string[] = [];
  const now = new Date();

  // --- new products ---
  if (cfg.products) {
    const since = wm.products ? new Date(wm.products) : null;
    const rows = await db.select({
      name: products.name, slug: products.slug, price: products.price,
      image: products.image, createdAt: products.createdAt, active: products.active,
    }).from(products).orderBy(desc(products.createdAt)).limit(50);
    const fresh = rows.filter((p) => p.active !== false && (!since || (p.createdAt && p.createdAt > since)));
    if (since && fresh.length) {
      await announce("announce-new-products", "products", fresh.map((p) => ({
        title: p.name,
        url: `${appUrl()}/product/${encodeURIComponent(p.slug)}`,
        image: p.image || "",
        note: money(p.price),
      })));
      ran.push(`products:${fresh.length}`);
    }
    await writeWatermarks({ products: now.toISOString() });
  }

  // --- new blog posts and recipes (same table, split by category) ---
  if (cfg.blog || cfg.recipes) {
    const rows = await db.select({
      title: blogPosts.title, slug: blogPosts.slug, category: blogPosts.category,
      coverImage: blogPosts.coverImage, excerpt: blogPosts.excerpt,
      status: blogPosts.status, createdAt: blogPosts.createdAt,
    }).from(blogPosts).orderBy(desc(blogPosts.createdAt)).limit(50);
    const published = rows.filter((p) => p.status === "published");
    const isRecipe = (c: string | null) => /^recipe/i.test((c ?? "").trim());

    if (cfg.blog) {
      const since = wm.blog ? new Date(wm.blog) : null;
      const fresh = published.filter((p) => !isRecipe(p.category) && (!since || (p.createdAt && p.createdAt > since)));
      if (since && fresh.length) {
        await announce("announce-new-blog", "blog", fresh.map((p) => ({
          title: p.title, url: `${appUrl()}/blog/${encodeURIComponent(p.slug)}`,
          image: p.coverImage || "", note: p.excerpt || "",
        })));
        ran.push(`blog:${fresh.length}`);
      }
      await writeWatermarks({ blog: now.toISOString() });
    }
    if (cfg.recipes) {
      const since = wm.recipes ? new Date(wm.recipes) : null;
      const fresh = published.filter((p) => isRecipe(p.category) && (!since || (p.createdAt && p.createdAt > since)));
      if (since && fresh.length) {
        await announce("announce-new-recipe", "recipes", fresh.map((p) => ({
          title: p.title, url: `${appUrl()}/blog/${encodeURIComponent(p.slug)}`,
          image: p.coverImage || "", note: p.excerpt || "",
        })));
        ran.push(`recipes:${fresh.length}`);
      }
      await writeWatermarks({ recipes: now.toISOString() });
    }
  }

  // --- price drops ---
  // There is no price history table, so the last announced price per product is
  // the watermark. Only DROPS are announced, and only beyond a threshold, so
  // rounding a price down by a few taka doesn't mail the whole list.
  if (cfg.priceDrops) {
    const rows = await db.select({
      id: products.id, name: products.name, slug: products.slug,
      price: products.price, image: products.image, active: products.active,
    }).from(products).limit(500);
    const seen: Record<string, number> = { ...(wm.prices ?? {}) };
    const drops: { title: string; url: string; image?: string; note?: string }[] = [];
    const firstRun = !wm.prices;

    for (const p of rows) {
      if (p.active === false) continue;
      const before = seen[p.id];
      if (before !== undefined && p.price < before) {
        const pct = Math.round(((before - p.price) / before) * 100);
        if (pct >= cfg.minPriceDropPercent) {
          drops.push({
            title: p.name,
            url: `${appUrl()}/product/${encodeURIComponent(p.slug)}`,
            image: p.image || "",
            note: `${money(before)} → ${money(p.price)} (${pct}% off)`,
          });
        }
      }
      seen[p.id] = p.price;
    }
    if (!firstRun && drops.length) {
      await announce("announce-price-drop", "offers", drops);
      ran.push(`priceDrops:${drops.length}`);
    }
    await writeWatermarks({ prices: seen });
  }

  // --- the weekly digest ---
  // Deliberately NOT relying on the scheduler's interval: schedule() keeps its
  // "last run" in memory, so every process restart would fire it again and
  // re-blast the list. The watermark is the only thing that decides.
  if (cfg.weeklyDigest) {
    const last = wm.weeklyDigest ? new Date(wm.weeklyDigest) : null;
    const daysSince = last ? (now.getTime() - last.getTime()) / 86_400_000 : Infinity;
    const isDigestDay = now.getDay() === cfg.digestDay;
    if (daysSince >= 6.5 && (isDigestDay || daysSince >= 8)) {
      const res = await buildWeeklyDigest();
      if (res) ran.push(`digest:${res.audience}`);
      await writeWatermarks({ weeklyDigest: now.toISOString() });
    }
  }

  if (ran.length) console.log("[newsletter] announcements:", ran.join(", "));
  return { ran };
}

/**
 * Set every watermark to "now" without sending anything.
 *
 * Called when an automation is switched on, so turning on "new products" does
 * not immediately mail the entire back catalogue as if it were new.
 */
export async function primeWatermarks(): Promise<void> {
  const now = new Date().toISOString();
  const rows = await db.select({ id: products.id, price: products.price }).from(products).limit(500);
  const prices: Record<string, number> = {};
  for (const p of rows) prices[p.id] = p.price;
  await writeWatermarks({ products: now, blog: now, recipes: now, prices });
}

export async function campaignHistory(limit = 50) {
  return db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.createdAt)).limit(limit);
}

export async function subscriberStats(): Promise<{ active: number; unsubscribed: number; byTopic: Record<string, number> }> {
  const rows = await db.select({
    status: newsletterSubscribers.status,
    topics: newsletterSubscribers.topics,
  }).from(newsletterSubscribers);
  const byTopic: Record<string, number> = { products: 0, blog: 0, recipes: 0, offers: 0, digest: 0 };
  let active = 0, unsubscribed = 0;
  for (const r of rows) {
    if (r.status === "active") {
      active++;
      for (const k of Object.keys(byTopic)) {
        if ((r.topics as Partial<NewsletterTopics> | null)?.[k as keyof NewsletterTopics] !== false) byTopic[k]++;
      }
    } else unsubscribed++;
  }
  return { active, unsubscribed, byTopic };
}
