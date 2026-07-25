import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// A reset simply deletes the relevant settings key(s) so the getters fall back
// to their built-in defaults. It never touches products, orders, users,
// categories, pages, blog, media — only editable configuration.
const RESET_KEYS: Record<string, string[]> = {
  theme: ["theme"],
  customcode: ["customcode"],
  homepage: ["homepage"],
  settings: ["store"],
  branding: ["branding"],
  delivery: ["delivery"],
  credentials: ["payments", "sms", "social"],
  seo: ["seo"],
  appearance: ["theme", "customcode", "homepage"],
  everything: ["theme", "customcode", "homepage", "store", "branding", "delivery", "seo"],
};

export const adminResetConfig = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ target: z.string().max(40) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; cleared: string[] }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { settings } = await import("@/server/db/schema");
    const { inArray } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const keys = RESET_KEYS[data.target];
    if (!keys) throw new Error("Unknown reset target");
    await db.delete(settings).where(inArray(settings.key, keys));
    await audit(actor, "config.reset", "settings", data.target, { keys });
    return { ok: true, cleared: keys };
  });
