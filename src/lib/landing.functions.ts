import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { LandingPage } from "./config-types";

type Row = { id: string; slug: string; title: string; html: string; css: string; metaTitle: string; metaDescription: string; ogImage: string; noindex: boolean; published: boolean; updatedAt: Date };
function toLanding(r: Row): LandingPage {
  return { id: r.id, slug: r.slug, title: r.title, html: r.html, css: r.css, metaTitle: r.metaTitle ?? "", metaDescription: r.metaDescription ?? "", ogImage: r.ogImage ?? "", noindex: !!r.noindex, published: r.published, updatedAt: (r.updatedAt instanceof Date ? r.updatedAt : new Date(r.updatedAt)).toISOString() };
}

function slugify(s: string): string {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "page";
}

// Strip scripts and inline event handlers — landing pages are admin-authored but
// we still never emit executable JS from stored content.
function sanitize(html: string): string {
  return (html || "")
    // Remove script/iframe/object/embed entirely (including unclosed tags).
    .replace(/<\s*script\b[\s\S]*?(<\/\s*script\s*>|$)/gi, "")
    .replace(/<\s*(iframe|object|embed|base|meta|link)\b[^>]*>/gi, "")
    // Inline event handlers, quoted or bare.
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\ssrcdoc\s*=/gi, " data-srcdoc=");
}

// CSS is injected into a <style> element, so the only escape is closing the tag.
// Neutralise "</style>" (and any stray "</") plus JS-bearing url()/expression().
function sanitizeCss(css: string): string {
  return (css || "")
    .replace(/<\s*\/\s*style/gi, "")
    .replace(/<\s*\//g, "")
    .replace(/javascript:/gi, "")
    .replace(/expression\s*\(/gi, "");
}

export const adminListLanding = createServerFn({ method: "GET" }).handler(async (): Promise<LandingPage[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  await requireStaff();
  const { db } = await import("@/server/db");
  const { landingPages } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  const rows = await db.select().from(landingPages).orderBy(desc(landingPages.updatedAt));
  return (rows as Row[]).map(toLanding);
});

export const adminGetLanding = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<LandingPage | null> => {
    const { requireStaff } = await import("@/server/auth/context");
    await requireStaff();
    const { db } = await import("@/server/db");
    const { landingPages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(landingPages).where(eq(landingPages.id, data.id)).limit(1);
    return row ? toLanding(row as Row) : null;
  });

export const adminSaveLanding = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      slug: z.string().trim().max(80).default(""),
      title: z.string().trim().min(1).max(160).default("Untitled"),
      html: z.string().max(1_000_000).default(""),
      css: z.string().max(500_000).default(""),
      metaTitle: z.string().trim().max(200).default(""),
      metaDescription: z.string().trim().max(400).default(""),
      ogImage: z.string().trim().max(500).default(""),
      noindex: z.boolean().default(false),
      published: z.boolean().default(false),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<LandingPage> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { db } = await import("@/server/db");
    const { landingPages } = await import("@/server/db/schema");
    const { eq, and, ne } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");

    let slug = slugify(data.slug || data.title);
    // Ensure slug uniqueness (append -2, -3… on collision with a different row).
    for (let n = 1; n < 50; n++) {
      const candidate = n === 1 ? slug : `${slug}-${n}`;
      const clash = await db.select({ id: landingPages.id }).from(landingPages)
        .where(data.id ? and(eq(landingPages.slug, candidate), ne(landingPages.id, data.id)) : eq(landingPages.slug, candidate)).limit(1);
      if (clash.length === 0) { slug = candidate; break; }
    }

    const values = { slug, title: data.title, html: sanitize(data.html), css: sanitizeCss(data.css), metaTitle: data.metaTitle, metaDescription: data.metaDescription, ogImage: data.ogImage, noindex: data.noindex, published: data.published, updatedAt: new Date() };
    let row;
    if (data.id) {
      [row] = await db.update(landingPages).set(values).where(eq(landingPages.id, data.id)).returning();
    } else {
      [row] = await db.insert(landingPages).values(values).returning();
    }
    await audit(actor, "landing.save", "landing", row.id, { slug, published: data.published });
    return toLanding(row as Row);
  });

export const adminDeleteLanding = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const actor = await requireManager();
    const { db } = await import("@/server/db");
    const { landingPages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(landingPages).where(eq(landingPages.id, data.id));
    const { audit } = await import("@/server/audit");
    await audit(actor, "landing.delete", "landing", data.id);
    return { ok: true };
  });

// Public: fetch a published landing page by slug.
export const getLandingPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().max(80) }).parse(i))
  .handler(async ({ data }): Promise<{ title: string; html: string; css: string; metaTitle: string; metaDescription: string; ogImage: string; noindex: boolean; slug: string } | null> => {
    const { db } = await import("@/server/db");
    const { landingPages } = await import("@/server/db/schema");
    const { eq, and } = await import("drizzle-orm");
    const [row] = await db.select().from(landingPages).where(and(eq(landingPages.slug, data.slug), eq(landingPages.published, true))).limit(1);
    if (!row) return null;
    return { title: row.title, html: sanitize(row.html), css: sanitizeCss(row.css), metaTitle: row.metaTitle ?? "", metaDescription: row.metaDescription ?? "", ogImage: row.ogImage ?? "", noindex: !!row.noindex, slug: row.slug };
  });
