import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const img = (seed: string, w = 600, h = 600) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;

/**
 * Apply a starter template: sets theme, currency, homepage copy & branding, and
 * seeds the vertical's demo categories + products. Additive + idempotent
 * (skips categories/products whose slug already exists) so it never deletes
 * existing data. Manager+ only.
 */
export const applyStarterTemplate = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().max(60) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; categories: number; products: number }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const schema = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const { STARTER_TEMPLATES } = await import("@/lib/starter-templates");
    const { THEME_PRESETS, defaultTheme } = await (async () => { const m = await import("@/lib/theme-presets"); await m.loadPresetGallery(); return m; })();
    const { defaultHomepage, defaultSettings } = await import("@/server/content-defaults");

    const actor = await requireManager();
    const t = STARTER_TEMPLATES.find((x) => x.id === data.id);
    if (!t) throw new Error("Starter template not found");

    const getKey = async (key: string): Promise<Record<string, unknown>> => {
      const [r] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1);
      return (r?.value as Record<string, unknown>) ?? {};
    };
    const setKey = async (key: string, value: Record<string, unknown>) => {
      await db.insert(schema.settings).values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: schema.settings.key, set: { value, updatedAt: new Date() } });
    };

    // 1) Theme
    await setKey("theme", (THEME_PRESETS[t.themePreset] ?? defaultTheme) as unknown as Record<string, unknown>);

    // 2) Store settings — name, announcement, currency
    const store = { ...defaultSettings, ...(await getKey("store")) } as Record<string, unknown>;
    store.storeName = t.store.storeName;
    store.announcement = t.store.announcement;
    store.currency = t.currency.code;
    store.currencySymbol = t.currency.symbol;
    store.currencyDecimals = t.currency.decimals;
    store.currencyPosition = t.currency.position;
    await setKey("store", store);

    // 3) Branding
    const branding = await getKey("branding");
    await setKey("branding", { ...branding, storeName: t.store.storeName, announcement: t.store.announcement });

    // 4) Homepage copy (recipes/masala are fish-specific → off for other verticals)
    const hp = { ...defaultHomepage, ...(await getKey("homepage")) } as Record<string, unknown>;
    Object.assign(hp, {
      heroEyebrow: t.store.heroEyebrow,
      heroTitleTop: t.store.heroTitleTop,
      heroTitleBottom: t.store.heroTitleBottom,
      heroSubtitle: t.store.heroSubtitle,
      heroCtaPrimary: { label: t.store.ctaPrimaryLabel, href: "/shop" },
      heroCtaSecondary: { label: t.store.ctaSecondaryLabel, href: "/shop" },
      heroImage: img(`${t.id}-hero`, 1600, 800),
      categoriesTitle: t.store.categoriesTitle,
      bestSellersTitle: t.store.bestSellersTitle,
      newArrivalsTitle: t.store.newArrivalsTitle,
      stats: t.store.stats,
      features: t.store.features,
      sections: { ...defaultHomepage.sections, ...((hp.sections as object) ?? {}), recipes: false, masala: false },
    });
    await setKey("homepage", hp);

    // 5) Categories (skip existing slugs)
    let catCount = 0;
    for (let i = 0; i < t.categories.length; i++) {
      const c = t.categories[i];
      const [ex] = await db.select({ id: schema.categories.id }).from(schema.categories).where(eq(schema.categories.slug, c.slug)).limit(1);
      if (ex) continue;
      await db.insert(schema.categories).values({ slug: c.slug, name: c.name, bn: "", image: img(`${t.id}-${c.slug}`, 600, 400), sort: i, active: true });
      catCount++;
    }

    // 6) Products (prices → integer minor units; skip existing slugs)
    const factor = Math.pow(10, t.currency.decimals);
    let prodCount = 0;
    for (const p of t.products) {
      const [ex] = await db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.slug, p.slug)).limit(1);
      if (ex) continue;
      const price = Math.round(p.price * factor);
      const compareAt = p.compareAt ? Math.round(p.compareAt * factor) : null;
      await db.insert(schema.products).values({
        slug: p.slug, name: p.name, bn: "", categorySlug: p.categorySlug, price, compareAt, unit: "",
        description: p.description, image: img(`${t.id}-${p.slug}`), images: [img(`${t.id}-${p.slug}`)],
        weightOptions: p.weightOptions ?? [], stock: p.stock, rating: 0, reviewsCount: 0,
        isBestSeller: p.bestSeller, isNewArrival: p.newArrival, active: true,
      });
      prodCount++;
    }

    await audit(actor, "starter.apply", "template", t.id, { products: prodCount, categories: catCount });
    return { ok: true, categories: catCount, products: prodCount };
  });
