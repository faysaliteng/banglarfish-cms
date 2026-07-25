import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Theme } from "./types";
import { defaultTheme } from "./theme-presets";

// Public: read the active theme. Resilient — never throws (falls back to default)
// so the root loader can't take the whole site down if the DB hiccups.
export const getTheme = createServerFn({ method: "GET" }).handler(async (): Promise<Theme> => {
  try {
    const { getThemeValue } = await import("@/server/settings");
    return await getThemeValue();
  } catch {
    return defaultTheme;
  }
});

export const adminGetTheme = createServerFn({ method: "GET" }).handler(async (): Promise<Theme> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { getThemeValue } = await import("@/server/settings");
  await requireStaff();
  return getThemeValue();
});

const FONTS = ["inter", "poppins", "system", "manrope", "playfair", "montserrat", "space", "jakarta"] as const;

const ThemeInput = z.object({
  preset: z.string().max(40),
  primary: z.string().max(40),
  brand: z.string().max(40),
  accent2: z.string().max(40).default("#7C5CFC"),
  background: z.string().max(40),
  card: z.string().max(40),
  foreground: z.string().max(40),
  radius: z.number().int().min(0).max(40),
  surface: z.enum(["flat", "elevated", "glass", "neo", "clay", "glossy", "outline", "aurora"]),
  hero: z.enum(["split", "centered", "fullbleed", "minimal", "spotlight", "diagonal", "showcase", "gradient"]),
  bg: z.enum(["solid", "gradient", "mesh", "aurora", "grid", "dots", "waves", "rays", "noise"]),
  font: z.enum(FONTS),
  displayFont: z.enum(FONTS).default("poppins"),
  fontScale: z.number().min(0.9).max(1.15).default(1),
  blur: z.number().int().min(0).max(40).default(16),
  opacity: z.number().int().min(40).max(100).default(100),
  depth: z.number().int().min(0).max(100).default(42),
  glow: z.number().int().min(0).max(100).default(18),
  dark: z.boolean(),
  gradientButtons: z.boolean().default(false),
  hover3d: z.boolean().default(false),
  animations: z.boolean().default(true),
  pill: z.boolean().default(false),
  customCss: z.string().max(20000).default(""),
});

export const adminSaveTheme = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ThemeInput.parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveThemeValue } = await import("@/server/settings");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveThemeValue(data);
    await audit(actor, "theme.update", "theme", "theme", { preset: data.preset });
    return { ok: true };
  });
