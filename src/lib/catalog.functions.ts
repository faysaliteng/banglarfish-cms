import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Banner, Category, CmsPage, Homepage, MenuItem, Product, Review, Settings, BlogPost, HomeSections } from "./types";

const isRecipe = (category?: string | null) => /^recipe/i.test((category ?? "").trim());

/* ---------- Categories ---------- */
export const listCategories = createServerFn({ method: "GET" }).handler(async (): Promise<Category[]> => {
  const { db } = await import("@/server/db");
  const { categories } = await import("@/server/db/schema");
  const { asc, eq } = await import("drizzle-orm");
  const rows = await db.select().from(categories).where(eq(categories.active, true)).orderBy(asc(categories.sort));
  return rows.map((c) => ({ slug: c.slug, name: c.name, bn: c.bn, image: c.image }));
});

/* ---------- Products ---------- */
const ListInput = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(["popular", "price-asc", "price-desc", "newest"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  inStock: z.boolean().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(60).optional(),
});

async function loadProducts(where: (t: unknown) => unknown, orderBy?: unknown) {
  const { db } = await import("@/server/db");
  const { products, productVariants } = await import("@/server/db/schema");
  const { toProduct } = await import("@/server/mappers");
  const rows = await db.select().from(products).where(where(products) as never);
  const ids = rows.map((r) => r.id);
  let variants: (typeof productVariants.$inferSelect)[] = [];
  if (ids.length) {
    const { inArray } = await import("drizzle-orm");
    variants = await db.select().from(productVariants).where(inArray(productVariants.productId, ids));
  }
  const byProduct = new Map<string, (typeof productVariants.$inferSelect)[]>();
  for (const v of variants) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }
  void orderBy;
  return rows.map((r) => toProduct(r, byProduct.get(r.id) ?? []));
}

export const listProducts = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => ListInput.parse(i ?? {}))
  .handler(async ({ data }): Promise<{ items: Product[]; total: number }> => {
    const { db } = await import("@/server/db");
    const { products, productVariants } = await import("@/server/db/schema");
    const { toProduct } = await import("@/server/mappers");
    const { and, or, eq, ilike, gte, lte, asc, desc, inArray } = await import("drizzle-orm");

    const conds = [eq(products.active, true)];
    if (data.category) conds.push(eq(products.categorySlug, data.category));
    if (data.q) {
      const like = `%${data.q}%`;
      conds.push(or(ilike(products.name, like), ilike(products.bn, like), ilike(products.slug, like))!);
    }
    if (typeof data.minPrice === "number") conds.push(gte(products.price, data.minPrice));
    if (typeof data.maxPrice === "number") conds.push(lte(products.price, data.maxPrice));
    if (data.inStock) conds.push(gte(products.stock, 1));

    const order =
      data.sort === "price-asc" ? asc(products.price)
      : data.sort === "price-desc" ? desc(products.price)
      : data.sort === "newest" ? desc(products.createdAt)
      : desc(products.reviewsCount);

    const rows = await db.select().from(products).where(and(...conds)).orderBy(order);
    const ids = rows.map((r) => r.id);
    const variants = ids.length
      ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids))
      : [];
    const byProduct = new Map<string, (typeof productVariants.$inferSelect)[]>();
    for (const v of variants) {
      const arr = byProduct.get(v.productId) ?? [];
      arr.push(v);
      byProduct.set(v.productId, arr);
    }
    const items = rows.map((r) => toProduct(r, byProduct.get(r.id) ?? []));
    return { items, total: items.length };
  });

export const listBestSellers = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { products } = await import("@/server/db/schema");
  const { and, eq } = await import("drizzle-orm");
  return loadProducts(() => and(eq(products.active, true), eq(products.isBestSeller, true)));
});

export const listNewArrivals = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { products } = await import("@/server/db/schema");
  const { and, eq } = await import("drizzle-orm");
  return loadProducts(() => and(eq(products.active, true), eq(products.isNewArrival, true)));
});

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }): Promise<{ product: Product; related: Product[]; reviews: Review[] } | null> => {
    const { db } = await import("@/server/db");
    const { products, productVariants, reviews } = await import("@/server/db/schema");
    const { toProduct } = await import("@/server/mappers");
    const { and, eq, ne, desc } = await import("drizzle-orm");

    const [row] = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
    if (!row) return null;
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, row.id));
    const product = toProduct(row, variants);

    const relatedRows = await db
      .select()
      .from(products)
      .where(and(eq(products.categorySlug, row.categorySlug), ne(products.id, row.id), eq(products.active, true)))
      .limit(4);
    const related = relatedRows.map((r) => toProduct(r, []));

    const revRows = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.productId, row.id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.createdAt))
      .limit(20);
    const reviewList: Review[] = revRows.map((r) => ({
      id: r.id,
      productId: r.productId ?? "",
      productName: r.productName,
      customer: r.customer,
      rating: r.rating,
      title: r.title,
      body: r.body,
      createdAt: r.createdAt.toISOString(),
      status: r.status,
    }));
    return { product, related, reviews: reviewList };
  });

/* ---------- Content ---------- */
export const getHomepage = createServerFn({ method: "GET" }).handler(async (): Promise<Homepage> => {
  const { db } = await import("@/server/db");
  const { settings } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const { defaultHomepage } = await import("@/server/content-defaults");
  const [row] = await db.select().from(settings).where(eq(settings.key, "homepage")).limit(1);
  const saved = (row?.value as Partial<Homepage>) ?? {};
  const merged = { ...defaultHomepage, ...saved } as Homepage;
  // Deep-merge section toggles so newly-added sections stay on for old configs.
  merged.sections = { ...defaultHomepage.sections, ...(saved.sections ?? {}) };
  return merged;
});

export const getSiteSections = createServerFn({ method: "GET" }).handler(async (): Promise<HomeSections> => {
  const { db } = await import("@/server/db");
  const { settings } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const { defaultHomepage } = await import("@/server/content-defaults");
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "homepage")).limit(1);
    const saved = (row?.value as Partial<Homepage>) ?? {};
    return { ...defaultHomepage.sections, ...(saved.sections ?? {}) };
  } catch {
    return defaultHomepage.sections;
  }
});

export const getSettings = createServerFn({ method: "GET" }).handler(async (): Promise<Settings> => {
  const { db } = await import("@/server/db");
  const { settings } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const { defaultSettings } = await import("@/server/content-defaults");
  const [row] = await db.select().from(settings).where(eq(settings.key, "store")).limit(1);
  return { ...defaultSettings, ...((row?.value as Partial<Settings>) ?? {}) };
});

export const adminListSubscribers = createServerFn({ method: "GET" }).handler(async (): Promise<{ email: string; couponCode: string; createdAt: string }[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  await requireStaff();
  const { db } = await import("@/server/db");
  const { newsletterSubscribers } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  const rows = await db.select().from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)).limit(5000);
  return rows.map((r) => ({ email: r.email, couponCode: r.couponCode ?? "", createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString() }));
});

export const getPage = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }): Promise<CmsPage | null> => {
    const { db } = await import("@/server/db");
    const { pages } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [row] = await db.select().from(pages).where(and(eq(pages.slug, data.slug), eq(pages.status, "published"))).limit(1);
    if (!row) return null;
    return {
      id: row.id, slug: row.slug, title: row.title, body: row.body, status: row.status, updatedAt: row.updatedAt.toISOString().slice(0, 10),
      metaTitle: row.metaTitle ?? undefined, metaDescription: row.metaDescription ?? undefined, ogImage: row.ogImage ?? undefined,
      noindex: row.noindex, template: row.template,
      faq: (row.faq ?? []).filter((f) => f && f.q && f.a),
    };
  });

export const listBanners = createServerFn({ method: "GET" }).handler(async (): Promise<Banner[]> => {
  const { db } = await import("@/server/db");
  const { banners } = await import("@/server/db/schema");
  const { asc, eq } = await import("drizzle-orm");
  const rows = await db.select().from(banners).where(eq(banners.active, true)).orderBy(asc(banners.sort));
  return rows.map((b) => ({ ...b }));
});

export const getMenus = createServerFn({ method: "GET" }).handler(async (): Promise<{ header: MenuItem[]; footer: MenuItem[] }> => {
  const { db } = await import("@/server/db");
  const { menus } = await import("@/server/db/schema");
  const rows = await db.select().from(menus);
  const header = rows.find((m) => m.location === "header")?.items ?? [];
  const footer = rows.find((m) => m.location === "footer")?.items ?? [];
  return { header, footer };
});

async function loadPosts(): Promise<BlogPost[]> {
  const { db } = await import("@/server/db");
  const { blogPosts } = await import("@/server/db/schema");
  const { desc, eq, and, or, isNull, lte } = await import("drizzle-orm");
  // Scheduled publishing: a post is public only when published AND its date has arrived.
  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.status, "published"), or(isNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, new Date()))))
    .orderBy(desc(blogPosts.publishedAt));
  return rows.map((p) => ({
    id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, coverImage: p.coverImage,
    author: p.author, category: p.category, tags: p.tags ?? [], status: p.status, publishedAt: p.publishedAt?.toISOString() ?? null,
    metaTitle: p.metaTitle ?? undefined, metaDescription: p.metaDescription ?? undefined, ogImage: p.ogImage ?? undefined,
    noindex: (p as { noindex?: boolean }).noindex ?? false, focusKeyword: (p as { focusKeyword?: string }).focusKeyword ?? "",
  }));
}

// Blog = articles (recipes are excluded — they have their own section).
export const listBlog = createServerFn({ method: "GET" }).handler(async (): Promise<BlogPost[]> => {
  const posts = await loadPosts();
  return posts.filter((p) => !isRecipe(p.category));
});

// Recipes = posts categorised "Recipe".
export const listRecipes = createServerFn({ method: "GET" }).handler(async (): Promise<BlogPost[]> => {
  const posts = await loadPosts();
  return posts.filter((p) => isRecipe(p.category));
});

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string() }).parse(i))
  .handler(async ({ data }): Promise<BlogPost | null> => {
    const { db } = await import("@/server/db");
    const { blogPosts } = await import("@/server/db/schema");
    const { and, eq, or, isNull, lte } = await import("drizzle-orm");
    const [p] = await db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, data.slug), eq(blogPosts.status, "published"), or(isNull(blogPosts.publishedAt), lte(blogPosts.publishedAt, new Date()))))
      .limit(1);
    if (!p) return null;
    return {
      id: p.id, slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, coverImage: p.coverImage, author: p.author,
      category: p.category, tags: p.tags ?? [], status: p.status, publishedAt: p.publishedAt?.toISOString() ?? null,
      metaTitle: p.metaTitle ?? undefined, metaDescription: p.metaDescription ?? undefined, ogImage: p.ogImage ?? undefined,
      noindex: (p as { noindex?: boolean }).noindex ?? false, focusKeyword: (p as { focusKeyword?: string }).focusKeyword ?? "",
    };
  });

/* ---------- Reviews & newsletter ---------- */
export const submitReview = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      productId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().min(2).max(120),
      body: z.string().trim().min(2).max(2000),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { products, reviews } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const user = await requireUser();
    const [p] = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
    if (!p) throw new Error("Product not found");
    await db.insert(reviews).values({
      productId: p.id,
      productName: p.name,
      userId: user.id,
      customer: user.fullName || user.email,
      rating: data.rating,
      title: data.title,
      body: data.body,
      status: "pending",
    });
    return { ok: true };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; issued: boolean; code?: string }> => {
    const email = data.email.toLowerCase();
    const { db } = await import("@/server/db");
    const { newsletterSubscribers, coupons } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { randomBytes } = await import("node:crypto");

    // Insert the subscriber; onConflictDoNothing returns no row if already subscribed.
    const inserted = await db.insert(newsletterSubscribers).values({ email }).onConflictDoNothing().returning({ id: newsletterSubscribers.id });
    if (inserted.length === 0) return { ok: true, issued: false }; // already subscribed → no new coupon

    // Generate a unique single-use 10% welcome coupon.
    let code = "";
    for (let i = 0; i < 20; i++) {
      const rnd = randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
      code = `WELCOME10-${rnd}`;
      const clash = await db.select({ id: coupons.id }).from(coupons).where(eq(coupons.code, code)).limit(1);
      if (clash.length === 0) break;
    }
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days
    try {
      await db.insert(coupons).values({ code, type: "percent", value: 10, minSubtotal: 0, usageLimit: 1, active: true, expiresAt });
      await db.update(newsletterSubscribers).set({ couponCode: code }).where(eq(newsletterSubscribers.id, inserted[0].id));
    } catch (e) {
      console.error("[newsletter] coupon create failed", e);
      return { ok: true, issued: false };
    }

    // Email the code (best-effort).
    try {
      const { sendEmailSafe, couponEmail } = await import("@/server/email");
      const mail = await couponEmail(code, 10);
      void sendEmailSafe({ ...mail, to: email });
    } catch { /* email best-effort */ }

    return { ok: true, issued: true, code };
  });
