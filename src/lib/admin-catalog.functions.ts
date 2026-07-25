import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Product, Category } from "./types";

export type AdminProduct = Product & { active: boolean };

const VariantInput = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(40),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});

const ProductInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(160),
  bn: z.string().trim().max(160).default(""),
  category: z.string().trim().max(120).default(""),
  price: z.number().int().nonnegative(),
  compareAt: z.number().int().nonnegative().nullable().optional(),
  unit: z.string().trim().max(20).default("kg"),
  description: z.string().trim().max(4000).default(""),
  image: z.string().trim().max(500).default(""),
  images: z.array(z.string()).default([]),
  weightOptions: z.array(z.string()).default([]),
  stock: z.number().int().nonnegative().default(0),
  isBest: z.boolean().default(false),
  isNew: z.boolean().default(false),
  active: z.boolean().default(true),
  variants: z.array(VariantInput).default([]),
  tags: z.array(z.string()).default([]),
  attributes: z.array(z.object({ name: z.string().max(60), value: z.string().max(200) })).default([]),
  sku: z.string().max(80).optional().nullable(),
  brand: z.string().max(120).optional().nullable(),
  metaTitle: z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(400).optional().nullable(),
  ogImage: z.string().max(1000).optional().nullable(),
});

export const adminListProducts = createServerFn({ method: "GET" }).handler(async (): Promise<AdminProduct[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { products, productVariants } = await import("@/server/db/schema");
  const { toProduct } = await import("@/server/mappers");
  const { desc, inArray } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  const ids = rows.map((r) => r.id);
  const variants = ids.length ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids)) : [];
  const byProduct = new Map<string, (typeof productVariants.$inferSelect)[]>();
  for (const v of variants) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }
  return rows.map((r) => ({ ...toProduct(r, byProduct.get(r.id) ?? []), active: r.active }));
});

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ProductInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { products, productVariants } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const user = await requireStaff();

    const base = {
      slug: data.slug,
      name: data.name,
      bn: data.bn,
      categorySlug: data.category,
      price: data.price,
      compareAt: data.compareAt ?? null,
      unit: data.unit,
      description: data.description,
      image: data.image,
      images: data.images,
      weightOptions: data.weightOptions,
      stock: data.stock,
      isBestSeller: data.isBest,
      isNewArrival: data.isNew,
      active: data.active,
      tags: data.tags,
      attributes: data.attributes,
      sku: data.sku ?? null,
      brand: data.brand ?? null,
      metaTitle: data.metaTitle ?? null,
      metaDescription: data.metaDescription ?? null,
      ogImage: data.ogImage ?? null,
      updatedAt: new Date(),
    };

    let productId: string;
    if (data.id) {
      await db.update(products).set(base).where(eq(products.id, data.id));
      productId = data.id;
    } else {
      const [row] = await db.insert(products).values(base).returning({ id: products.id });
      productId = row.id;
    }

    // Replace variants with the provided set.
    await db.delete(productVariants).where(eq(productVariants.productId, productId));
    if (data.variants.length) {
      await db.insert(productVariants).values(
        data.variants.map((v, idx) => ({ productId, label: v.label, price: v.price, stock: v.stock, sort: idx })),
      );
    }

    await audit(user, data.id ? "product.update" : "product.create", "product", productId, { name: data.name });
    return { id: productId };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { products } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const user = await requireStaff();
    await db.delete(products).where(eq(products.id, data.id));
    await audit(user, "product.delete", "product", data.id);
    return { ok: true };
  });

/* ---------- Categories ---------- */
const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(120),
  bn: z.string().trim().max(120).default(""),
  image: z.string().trim().max(500).default(""),
  sort: z.number().int().default(0),
  active: z.boolean().default(true),
});

export const adminListCategories = createServerFn({ method: "GET" }).handler(async (): Promise<(Category & { id: string; active: boolean; sort: number })[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { categories } = await import("@/server/db/schema");
  const { asc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(categories).orderBy(asc(categories.sort));
  return rows.map((c) => ({ id: c.id, slug: c.slug, name: c.name, bn: c.bn, image: c.image, sort: c.sort, active: c.active }));
});

export const adminUpsertCategory = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CategoryInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { categories } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const user = await requireStaff();
    const values = { slug: data.slug, name: data.name, bn: data.bn, image: data.image, sort: data.sort, active: data.active };
    let id: string;
    if (data.id) {
      await db.update(categories).set(values).where(eq(categories.id, data.id));
      id = data.id;
    } else {
      const [row] = await db.insert(categories).values(values).returning({ id: categories.id });
      id = row.id;
    }
    await audit(user, data.id ? "category.update" : "category.create", "category", id, { name: data.name });
    return { id };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { categories } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const user = await requireStaff();
    await db.delete(categories).where(eq(categories.id, data.id));
    await audit(user, "category.delete", "category", data.id);
    return { ok: true };
  });
