import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Product } from "./types";

export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
};

export const getProfile = createServerFn({ method: "GET" }).handler(async (): Promise<Profile | null> => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { addresses } = await import("@/server/db/schema");
  const { and, eq, desc } = await import("drizzle-orm");
  const user = await requireUser();
  const [addr] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.userId, user.id), eq(addresses.isDefault, true)))
    .orderBy(desc(addresses.createdAt))
    .limit(1);
  return {
    id: user.id,
    full_name: user.fullName,
    phone: user.phone,
    address_line1: addr?.addressLine1 ?? "",
    address_line2: addr?.addressLine2 ?? null,
    city: addr?.city ?? "",
    district: addr?.district ?? null,
    postal_code: addr?.postalCode ?? null,
  };
});

const ProfileUpdate = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20),
  address_line1: z.string().trim().min(3).max(200),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ProfileUpdate.parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users, addresses } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const user = await requireUser();

    // Enforce delivery-area coverage before saving the address.
    const { getDeliveryConfig } = await import("@/server/site-config");
    const { isAddressCovered } = await import("@/lib/delivery");
    const deliveryCfg = await getDeliveryConfig();
    if (!isAddressCovered({ city: data.city, district: data.district, address_line1: data.address_line1, postal_code: data.postal_code }, deliveryCfg)) {
      throw new Error(deliveryCfg.message || "Sorry, we don't deliver to that area yet.");
    }

    await db.update(users).set({ fullName: data.full_name, phone: data.phone, updatedAt: new Date() }).where(eq(users.id, user.id));

    const [existing] = await db.select().from(addresses).where(and(eq(addresses.userId, user.id), eq(addresses.isDefault, true))).limit(1);
    const values = {
      fullName: data.full_name,
      phone: data.phone,
      addressLine1: data.address_line1,
      addressLine2: data.address_line2 ?? null,
      city: data.city,
      district: data.district ?? null,
      postalCode: data.postal_code ?? null,
    };
    if (existing) await db.update(addresses).set(values).where(eq(addresses.id, existing.id));
    else await db.insert(addresses).values({ userId: user.id, label: "Home", isDefault: true, ...values });
    return { ok: true };
  });

export const changeEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { and, eq, ne } = await import("drizzle-orm");
    const user = await requireUser();
    const dupe = await db.select({ id: users.id }).from(users).where(and(eq(users.email, data.email.toLowerCase()), ne(users.id, user.id))).limit(1);
    if (dupe.length) throw new Error("That email is already in use.");
    await db.update(users).set({ email: data.email.toLowerCase(), updatedAt: new Date() }).where(eq(users.id, user.id));
    return { ok: true };
  });

export const changePassword = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ current: z.string().min(1), password: z.string().min(8).max(72) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { verifyPassword, hashPassword } = await import("@/server/auth/password");
    const { eq } = await import("drizzle-orm");
    const user = await requireUser();
    if (!(await verifyPassword(data.current, user.passwordHash))) throw new Error("Current password is incorrect.");
    await db.update(users).set({ passwordHash: await hashPassword(data.password), updatedAt: new Date() }).where(eq(users.id, user.id));
    return { ok: true };
  });

/* ---------- Wishlist ---------- */
export const listWishlist = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { wishlists, products, productVariants } = await import("@/server/db/schema");
  const { toProduct } = await import("@/server/mappers");
  const { eq, inArray } = await import("drizzle-orm");
  const user = await requireUser();
  const wl = await db.select().from(wishlists).where(eq(wishlists.userId, user.id));
  const ids = wl.map((w) => w.productId);
  if (!ids.length) return [];
  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const variants = await db.select().from(productVariants).where(inArray(productVariants.productId, ids));
  const byProduct = new Map<string, (typeof productVariants.$inferSelect)[]>();
  for (const v of variants) {
    const arr = byProduct.get(v.productId) ?? [];
    arr.push(v);
    byProduct.set(v.productId, arr);
  }
  return rows.map((r) => toProduct(r, byProduct.get(r.id) ?? []));
});

export const toggleWishlist = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ productId: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ inWishlist: boolean }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { wishlists } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const user = await requireUser();
    const [existing] = await db.select().from(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.productId, data.productId))).limit(1);
    if (existing) {
      await db.delete(wishlists).where(eq(wishlists.id, existing.id));
      return { inWishlist: false };
    }
    await db.insert(wishlists).values({ userId: user.id, productId: data.productId }).onConflictDoNothing();
    return { inWishlist: true };
  });
