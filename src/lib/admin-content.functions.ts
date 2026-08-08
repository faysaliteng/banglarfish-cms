import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Review, CmsPage, Homepage, Settings, Banner, MenuItem, BlogPost } from "./types";

export type MediaItem = { id: string; name: string; url: string; size: string; uploadedAt: string; alt: string; lqip: string };

/* ---------- Reviews ---------- */
export const adminListReviews = createServerFn({ method: "GET" }).handler(async (): Promise<Review[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { reviews } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
  return rows.map((r) => ({ id: r.id, productId: r.productId ?? "", productName: r.productName, customer: r.customer, rating: r.rating, title: r.title, body: r.body, createdAt: r.createdAt.toISOString().slice(0, 10), status: r.status }));
});

export const adminSetReviewStatus = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { reviews, products } = await import("@/server/db/schema");
    const { eq, and, avg, count } = await import("drizzle-orm");
    await requireStaff();
    const [rev] = await db.select().from(reviews).where(eq(reviews.id, data.id)).limit(1);
    await db.update(reviews).set({ status: data.status }).where(eq(reviews.id, data.id));
    // Recompute product rating from approved reviews.
    if (rev?.productId) {
      const [agg] = await db
        .select({ a: avg(reviews.rating), c: count() })
        .from(reviews)
        .where(and(eq(reviews.productId, rev.productId), eq(reviews.status, "approved")));
      await db.update(products).set({ rating: agg?.a ? Number(agg.a) : 0, reviewsCount: Number(agg?.c ?? 0) }).where(eq(products.id, rev.productId));
    }
    return { ok: true };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { reviews } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(reviews).where(eq(reviews.id, data.id));
    return { ok: true };
  });

/* ---------- Pages (CMS) ---------- */
export const adminListPages = createServerFn({ method: "GET" }).handler(async (): Promise<CmsPage[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { pages } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(pages).orderBy(desc(pages.updatedAt));
  return rows.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, body: p.body, status: p.status, updatedAt: p.updatedAt.toISOString().slice(0, 10),
    metaTitle: p.metaTitle ?? undefined, metaDescription: p.metaDescription ?? undefined, ogImage: p.ogImage ?? undefined,
    noindex: p.noindex, template: p.template, faq: p.faq ?? [], showInHeader: p.showInHeader, showInFooter: p.showInFooter, sort: p.sort,
  }));
});

const PageInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(200000).default(""),
  status: z.enum(["draft", "published"]),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(400).optional().nullable(),
  ogImage: z.string().max(1000).optional().nullable(),
  noindex: z.boolean().optional(),
  template: z.string().max(40).optional(),
  faq: z.array(z.object({ q: z.string().max(300), a: z.string().max(2000) })).max(50).optional(),
  showInHeader: z.boolean().optional(),
  showInFooter: z.boolean().optional(),
  sort: z.number().int().optional(),
});

export const adminUpsertPage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => PageInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { pages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const actor = await requireStaff();
    const values = {
      slug: data.slug, title: data.title, body: data.body, status: data.status, updatedAt: new Date(),
      metaTitle: data.metaTitle ?? null, metaDescription: data.metaDescription ?? null, ogImage: data.ogImage ?? null,
      noindex: data.noindex ?? false, template: data.template ?? "default",
      faq: (data.faq ?? []).filter((f) => f.q.trim() && f.a.trim()),
      showInHeader: data.showInHeader ?? false, showInFooter: data.showInFooter ?? false, sort: data.sort ?? 0,
    };
    let id: string;
    if (data.id) {
      const [old] = await db.select({ slug: pages.slug }).from(pages).where(eq(pages.id, data.id)).limit(1);
      await saveRevision("page", data.id, actor);
      await db.update(pages).set(values).where(eq(pages.id, data.id));
      if (old?.slug && old.slug !== data.slug) await addSlugRedirect(`/pages/${old.slug}`, `/pages/${data.slug}`);
      id = data.id;
    } else {
      const [row] = await db.insert(pages).values(values).returning({ id: pages.id });
      id = row.id;
    }
    if (data.status === "published") {
      try {
        const { enqueue } = await import("@/server/jobs");
        const { emit } = await import("@/server/events");
        void enqueue("seo.indexnow", { paths: [`/pages/${data.slug}`] });
        void emit("content.published", { kind: "page", slug: data.slug, id });
      } catch { /* ignore */ }
    }
    return { id };
  });

export const adminDeletePage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { pages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(pages).where(eq(pages.id, data.id));
    return { ok: true };
  });

/* ---------- Media ---------- */
export const adminListMedia = createServerFn({ method: "GET" }).handler(async (): Promise<MediaItem[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { media } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(media).orderBy(desc(media.uploadedAt));
  return rows.map((m) => ({ id: m.id, name: m.name, url: m.url, size: m.size, uploadedAt: m.uploadedAt.toISOString().slice(0, 10), alt: (m as { alt?: string }).alt ?? "", lqip: (m as { lqip?: string }).lqip ?? "" }));
});

export const adminSetMediaAlt = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), alt: z.string().max(300) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { media } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.update(media).set({ alt: data.alt }).where(eq(media.id, data.id));
    return { ok: true };
  });

export const adminAddMedia = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ name: z.string().trim().min(1).max(200), url: z.string().trim().min(1).max(1000), size: z.string().max(40).default("") }).parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { media } = await import("@/server/db/schema");
    await requireStaff();
    const [row] = await db.insert(media).values({ name: data.name, url: data.url, size: data.size }).returning({ id: media.id });
    return { id: row.id };
  });

export const adminDeleteMedia = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { media } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(media).where(eq(media.id, data.id));
    return { ok: true };
  });

/* ---------- Homepage & Settings ---------- */
export const adminGetHomepage = createServerFn({ method: "GET" }).handler(async (): Promise<Homepage> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { getHomepageValue } = await import("@/server/settings");
  await requireStaff();
  return getHomepageValue();
});

export const adminSaveHomepage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as Homepage)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { getHomepageValue, saveHomepageValue } = await import("@/server/settings");
    await requireStaff();
    const current = await getHomepageValue();
    await saveHomepageValue({ ...current, ...(data as Partial<Homepage>) });
    return { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "GET" }).handler(async (): Promise<Settings> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { getSettingsValue } = await import("@/server/settings");
  await requireStaff();
  return getSettingsValue();
});

export const adminSaveSettings = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as Settings)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { getSettingsValue, saveSettingsValue } = await import("@/server/settings");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const current = await getSettingsValue();
    await saveSettingsValue({ ...current, ...(data as Partial<Settings>) });
    await audit(actor, "settings.update", "settings", "store");
    return { ok: true };
  });

/* ---------- Banners ---------- */
export const adminListBanners = createServerFn({ method: "GET" }).handler(async (): Promise<Banner[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { banners } = await import("@/server/db/schema");
  const { asc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(banners).orderBy(asc(banners.sort));
  return rows.map((b) => ({ ...b }));
});

const BannerInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(160).default(""),
  subtitle: z.string().trim().max(200).default(""),
  image: z.string().trim().max(1000).default(""),
  href: z.string().trim().max(500).default(""),
  placement: z.string().trim().max(40).default("hero"),
  sort: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const adminUpsertBanner = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => BannerInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { banners } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    const values = { title: data.title, subtitle: data.subtitle, image: data.image, href: data.href, placement: data.placement, sort: data.sort, active: data.active };
    let id: string;
    if (data.id) {
      await db.update(banners).set(values).where(eq(banners.id, data.id));
      id = data.id;
    } else {
      const [row] = await db.insert(banners).values(values).returning({ id: banners.id });
      id = row.id;
    }
    return { id };
  });

export const adminDeleteBanner = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { banners } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(banners).where(eq(banners.id, data.id));
    return { ok: true };
  });

/* ---------- Menus ---------- */
export const adminGetMenus = createServerFn({ method: "GET" }).handler(async (): Promise<{ header: MenuItem[]; footer: MenuItem[] }> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { menus } = await import("@/server/db/schema");
  await requireStaff();
  const rows = await db.select().from(menus);
  return { header: rows.find((m) => m.location === "header")?.items ?? [], footer: rows.find((m) => m.location === "footer")?.items ?? [] };
});

export const adminSaveMenu = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ location: z.enum(["header", "footer"]), items: z.array(z.object({ label: z.string().max(60), href: z.string().max(200) })) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { menus } = await import("@/server/db/schema");
    await requireStaff();
    await db.insert(menus).values({ location: data.location, items: data.items }).onConflictDoUpdate({ target: menus.location, set: { items: data.items } });
    return { ok: true };
  });

/* ---------- Blog ---------- */
export const adminListBlog = createServerFn({ method: "GET" }).handler(async (): Promise<BlogPost[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { blogPosts } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
  return rows.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, coverImage: p.coverImage, author: p.author,
    category: p.category, tags: p.tags ?? [], status: p.status, publishedAt: p.publishedAt?.toISOString() ?? null,
    metaTitle: p.metaTitle ?? undefined, metaDescription: p.metaDescription ?? undefined, ogImage: p.ogImage ?? undefined,
  }));
});

const BlogInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().max(500).default(""),
  body: z.string().max(200000).default(""),
  coverImage: z.string().max(1000).default(""),
  author: z.string().max(120).default(""),
  category: z.string().max(120).optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(400).optional().nullable(),
  ogImage: z.string().max(1000).optional().nullable(),
  status: z.enum(["draft", "published"]),
  publishedAt: z.string().optional().nullable(), // ISO / datetime-local; future date = scheduled
  noindex: z.boolean().optional(),
  focusKeyword: z.string().max(120).optional(),
});

// Slug-history 301: when content is renamed, redirect the old URL to the new one,
// and clear any stale redirect that pointed the new URL elsewhere (loop guard).
async function addSlugRedirect(from: string, to: string): Promise<void> {
  if (!from || from === to) return;
  try {
    const { db } = await import("@/server/db");
    const { redirects } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(redirects).where(eq(redirects.fromPath, to));
    await db.insert(redirects).values({ fromPath: from, toPath: to, code: 301, active: true })
      .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath: to, active: true } });
  } catch {
    /* redirect is best-effort */
  }
}

export const adminUpsertBlog = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => BlogInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { blogPosts } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const actor = await requireStaff();
    // Scheduled publishing: honour an explicit date (may be in the future); default to now.
    let publishedAt: Date | null = null;
    if (data.status === "published") {
      const d = data.publishedAt ? new Date(data.publishedAt) : new Date();
      publishedAt = isNaN(d.getTime()) ? new Date() : d;
    }
    const values = {
      slug: data.slug, title: data.title, excerpt: data.excerpt, body: data.body, coverImage: data.coverImage, author: data.author,
      category: data.category ?? "", tags: data.tags ?? [], metaTitle: data.metaTitle ?? null, metaDescription: data.metaDescription ?? null, ogImage: data.ogImage ?? null,
      status: data.status, publishedAt, noindex: data.noindex ?? false, focusKeyword: data.focusKeyword ?? "",
    };
    let id: string;
    if (data.id) {
      const [old] = await db.select({ slug: blogPosts.slug }).from(blogPosts).where(eq(blogPosts.id, data.id)).limit(1);
      // Snapshot the current version before overwriting (revision history).
      await saveRevision("blog", data.id, actor);
      await db.update(blogPosts).set(values).where(eq(blogPosts.id, data.id));
      if (old?.slug && old.slug !== data.slug) await addSlugRedirect(`/blog/${old.slug}`, `/blog/${data.slug}`);
      id = data.id;
    } else {
      const [row] = await db.insert(blogPosts).values(values).returning({ id: blogPosts.id });
      id = row.id;
    }
    if (data.status === "published") {
      try {
        const { enqueue } = await import("@/server/jobs");
        const { emit } = await import("@/server/events");
        void enqueue("seo.indexnow", { paths: [`/blog/${data.slug}`] });
        void emit("content.published", { kind: "blog", slug: data.slug, id });
      } catch { /* ignore */ }
    }
    return { id };
  });

export const adminDeleteBlog = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { blogPosts } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(blogPosts).where(eq(blogPosts.id, data.id));
    return { ok: true };
  });

/* ---------- Revision history (WordPress-style) ---------- */

export type RevisionRow = { id: string; title: string; authorEmail: string; createdAt: string };

// Snapshot the CURRENT stored version of an entity before it is overwritten.
// Best-effort: never blocks a save if history write fails. Keeps the latest 30.
async function saveRevision(entityType: "blog" | "page", entityId: string, actor: { email?: string }): Promise<void> {
  try {
    const { db } = await import("@/server/db");
    const { blogPosts, pages, contentRevisions } = await import("@/server/db/schema");
    const { eq, and, desc } = await import("drizzle-orm");
    let title = "";
    let snapshot: Record<string, unknown> | null = null;
    if (entityType === "blog") {
      const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, entityId)).limit(1);
      if (row) { title = row.title; snapshot = row as unknown as Record<string, unknown>; }
    } else {
      const [row] = await db.select().from(pages).where(eq(pages.id, entityId)).limit(1);
      if (row) { title = row.title; snapshot = row as unknown as Record<string, unknown>; }
    }
    if (!snapshot) return;
    await db.insert(contentRevisions).values({ entityType, entityId, title, data: snapshot, authorEmail: actor?.email ?? "" });
    // Prune to the 30 most recent revisions for this entity.
    const extra = await db
      .select({ id: contentRevisions.id })
      .from(contentRevisions)
      .where(and(eq(contentRevisions.entityType, entityType), eq(contentRevisions.entityId, entityId)))
      .orderBy(desc(contentRevisions.createdAt))
      .offset(30);
    if (extra.length) {
      const { inArray } = await import("drizzle-orm");
      await db.delete(contentRevisions).where(inArray(contentRevisions.id, extra.map((r) => r.id)));
    }
  } catch {
    /* history is non-fatal */
  }
}

export const adminListRevisions = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ entityType: z.enum(["blog", "page"]), entityId: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<RevisionRow[]> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contentRevisions } = await import("@/server/db/schema");
    const { and, eq, desc } = await import("drizzle-orm");
    await requireStaff();
    const rows = await db
      .select({ id: contentRevisions.id, title: contentRevisions.title, authorEmail: contentRevisions.authorEmail, createdAt: contentRevisions.createdAt })
      .from(contentRevisions)
      .where(and(eq(contentRevisions.entityType, data.entityType), eq(contentRevisions.entityId, data.entityId)))
      .orderBy(desc(contentRevisions.createdAt))
      .limit(30);
    return rows.map((r) => ({ id: r.id, title: r.title, authorEmail: r.authorEmail, createdAt: r.createdAt.toISOString() }));
  });

export const adminRestoreRevision = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; entityType: string; entityId: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { blogPosts, pages, contentRevisions } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const actor = await requireStaff();
    const [rev] = await db.select().from(contentRevisions).where(eq(contentRevisions.id, data.id)).limit(1);
    if (!rev) throw new Error("Revision not found");
    const snap = rev.data as Record<string, unknown>;
    // Snapshot the live version first so a restore is itself undoable.
    await saveRevision(rev.entityType as "blog" | "page", rev.entityId, actor);
    if (rev.entityType === "blog") {
      await db.update(blogPosts).set({
        slug: String(snap.slug ?? ""), title: String(snap.title ?? ""), excerpt: String(snap.excerpt ?? ""), body: String(snap.body ?? ""),
        coverImage: String(snap.coverImage ?? ""), author: String(snap.author ?? ""), category: String(snap.category ?? ""),
        tags: Array.isArray(snap.tags) ? (snap.tags as string[]) : [],
        metaTitle: (snap.metaTitle as string) ?? null, metaDescription: (snap.metaDescription as string) ?? null, ogImage: (snap.ogImage as string) ?? null,
        status: (snap.status as "draft" | "published") ?? "draft",
        publishedAt: snap.publishedAt ? new Date(snap.publishedAt as string) : null,
      }).where(eq(blogPosts.id, rev.entityId));
    } else {
      await db.update(pages).set({
        slug: String(snap.slug ?? ""), title: String(snap.title ?? ""), body: String(snap.body ?? ""),
        status: (snap.status as "draft" | "published") ?? "draft",
        metaTitle: (snap.metaTitle as string) ?? null, metaDescription: (snap.metaDescription as string) ?? null, ogImage: (snap.ogImage as string) ?? null,
        noindex: Boolean(snap.noindex), template: String(snap.template ?? "default"),
        showInHeader: Boolean(snap.showInHeader), showInFooter: Boolean(snap.showInFooter), sort: Number(snap.sort ?? 0),
        updatedAt: new Date(),
      }).where(eq(pages.id, rev.entityId));
    }
    return { ok: true, entityType: rev.entityType, entityId: rev.entityId };
  });
