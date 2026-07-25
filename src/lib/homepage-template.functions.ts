import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Apply a homepage template: sets the hero LAYOUT + which sections show + the
 * marketing COPY. Keeps the store's theme colors (colors come from Themes).
 */
export const applyHomepageTemplate = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().max(80) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { settings } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const { HOMEPAGE_TEMPLATES } = await import("@/lib/homepage-templates");
    const { defaultHomepage } = await import("@/server/content-defaults");
    const { defaultTheme } = await import("@/lib/theme-presets");

    const actor = await requireManager();
    const t = HOMEPAGE_TEMPLATES.find((x) => x.id === data.id);
    if (!t) throw new Error("Homepage template not found");

    const getKey = async (key: string): Promise<Record<string, unknown>> => {
      const [r] = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
      return (r?.value as Record<string, unknown>) ?? {};
    };
    const setKey = async (key: string, value: Record<string, unknown>) => {
      await db.insert(settings).values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } });
    };

    // Theme: change only the hero layout, keep colours.
    const theme = { ...(defaultTheme as unknown as Record<string, unknown>), ...(await getKey("theme")) };
    theme.hero = t.hero;
    await setKey("theme", theme);

    // Homepage: sections + copy.
    const hp = { ...(defaultHomepage as unknown as Record<string, unknown>), ...(await getKey("homepage")) };
    const prevPrimary = (hp.heroCtaPrimary as { href?: string }) ?? { href: "/shop" };
    const prevSecondary = (hp.heroCtaSecondary as { href?: string }) ?? { href: "/shop" };
    Object.assign(hp, {
      sections: { ...defaultHomepage.sections, ...((hp.sections as object) ?? {}), ...t.sections },
      heroEyebrow: t.copy.heroEyebrow,
      heroTitleTop: t.copy.heroTitleTop,
      heroTitleBottom: t.copy.heroTitleBottom,
      heroSubtitle: t.copy.heroSubtitle,
      heroCtaPrimary: { href: prevPrimary.href || "/shop", label: t.copy.ctaPrimaryLabel },
      heroCtaSecondary: { href: prevSecondary.href || "/shop", label: t.copy.ctaSecondaryLabel },
      categoriesTitle: t.copy.categoriesTitle,
      bestSellersTitle: t.copy.bestSellersTitle,
      newArrivalsTitle: t.copy.newArrivalsTitle,
    });
    await setKey("homepage", hp);

    await audit(actor, "homepage.template", "template", t.id, { hero: t.hero });
    return { ok: true };
  });
