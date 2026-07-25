// Client-safe theme presets + CSS generator (no server imports).
import type { Theme, ThemeFont } from "./types";
import { EXTRA_PRESETS } from "./theme-gallery";

/* ------------------------------------------------------------------ *
 * Fonts — each maps to a CSS font stack. New fonts must also be added
 * to the Google Fonts <link> in __root.tsx.
 * ------------------------------------------------------------------ */
export const FONT_STACK: Record<ThemeFont, string> = {
  inter: '"Inter", ui-sans-serif, system-ui, sans-serif',
  poppins: '"Poppins", "Inter", sans-serif',
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  manrope: '"Manrope", "Inter", sans-serif',
  playfair: '"Playfair Display", Georgia, "Times New Roman", serif',
  montserrat: '"Montserrat", "Inter", sans-serif',
  space: '"Space Grotesk", "Inter", sans-serif',
  jakarta: '"Plus Jakarta Sans", "Inter", sans-serif',
};

export const FONT_OPTIONS: [ThemeFont, string][] = [
  ["inter", "Inter — modern sans"],
  ["poppins", "Poppins — rounded"],
  ["manrope", "Manrope — geometric"],
  ["jakarta", "Plus Jakarta — friendly"],
  ["montserrat", "Montserrat — bold"],
  ["space", "Space Grotesk — techy"],
  ["playfair", "Playfair — elegant serif"],
  ["system", "System — native"],
];

/* ------------------------------------------------------------------ *
 * Preset data. Every preset is a COMPLETE Theme (built via mk()) so
 * the type is satisfied and getThemeValue's {...default, ...saved}
 * merge always yields a full object.
 * ------------------------------------------------------------------ */
const FULL_DEFAULT: Theme = {
  preset: "classic",
  primary: "#29ABE2",
  brand: "#F26B4A",
  accent2: "#7C5CFC",
  background: "#ffffff",
  card: "#ffffff",
  foreground: "#10233a",
  radius: 12,
  surface: "elevated",
  hero: "split",
  bg: "solid",
  font: "inter",
  displayFont: "poppins",
  fontScale: 1,
  blur: 16,
  opacity: 100,
  depth: 42,
  glow: 18,
  dark: false,
  gradientButtons: false,
  hover3d: false,
  animations: true,
  pill: false,
  customCss: "",
};

/** Build a complete Theme from a partial (fills every field with a sane default). */
export function mk(p: Partial<Theme> & { preset: string }): Theme {
  return { ...FULL_DEFAULT, ...p };
}

export const THEME_PRESETS: Record<string, Theme> = {
  classic: mk({ preset: "classic", primary: "#29ABE2", brand: "#F26B4A", accent2: "#7C5CFC", background: "#ffffff", card: "#ffffff", foreground: "#10233a", radius: 12, surface: "elevated", hero: "split", bg: "solid", font: "inter", displayFont: "poppins", blur: 0, opacity: 100, depth: 40, glow: 14 }),
  glass: mk({ preset: "glass", primary: "#2CA6E0", brand: "#F26B4A", accent2: "#8b5cf6", background: "#eef5fb", card: "#ffffff", foreground: "#0f2233", radius: 22, surface: "glass", hero: "fullbleed", bg: "mesh", font: "poppins", displayFont: "poppins", blur: 18, opacity: 62, depth: 55, glow: 34, hover3d: true }),
  midnight: mk({ preset: "midnight", primary: "#38bdf8", brand: "#fb7185", accent2: "#a78bfa", background: "#0b1220", card: "#141f33", foreground: "#e6eefb", radius: 18, surface: "glass", hero: "centered", bg: "aurora", font: "inter", displayFont: "space", blur: 20, opacity: 60, depth: 60, glow: 55, dark: true }),
  ocean: mk({ preset: "ocean", primary: "#0ea5b7", brand: "#f59e0b", accent2: "#22d3ee", background: "#f0fbfc", card: "#ffffff", foreground: "#0f2f34", radius: 16, surface: "elevated", hero: "split", bg: "gradient", font: "manrope", displayFont: "manrope", blur: 0, opacity: 100, depth: 46, glow: 20 }),
  sunset: mk({ preset: "sunset", primary: "#fb7185", brand: "#f59e0b", accent2: "#f472b6", background: "#fff7f2", card: "#ffffff", foreground: "#3a1f1a", radius: 20, surface: "neo", hero: "centered", bg: "gradient", font: "poppins", displayFont: "poppins", blur: 0, opacity: 100, depth: 40, glow: 22, gradientButtons: true }),
  minimal: mk({ preset: "minimal", primary: "#111827", brand: "#6b7280", accent2: "#9ca3af", background: "#ffffff", card: "#ffffff", foreground: "#111827", radius: 4, surface: "flat", hero: "minimal", bg: "solid", font: "space", displayFont: "space", blur: 0, opacity: 100, depth: 0, glow: 0, animations: false }),
  // --- Extended gallery (generated + contrast-audited; every surface/bg/hero represented) ---
  aurora: mk({ preset: "aurora", primary: "#0B8574", brand: "#CE2A8C", accent2: "#8B5CF6", background: "#0A0E24", card: "#171E42", foreground: "#E9EDFF", radius: 18, surface: "glass", hero: "spotlight", bg: "aurora", font: "inter", displayFont: "space", fontScale: 1, blur: 20, opacity: 64, depth: 45, glow: 60, dark: true, gradientButtons: true, hover3d: true, animations: true, pill: false }),
  neon: mk({ preset: "neon", primary: "#D9198F", brand: "#077BA6", accent2: "#8B2BE8", background: "#08060F", card: "#14102E", foreground: "#EAF0FF", radius: 16, surface: "glass", hero: "gradient", bg: "grid", font: "inter", displayFont: "space", fontScale: 1, blur: 18, opacity: 64, depth: 60, glow: 78, dark: true, gradientButtons: true, hover3d: true, animations: true, pill: false }),
  ember: mk({ preset: "ember", primary: "#E84A18", brand: "#E11D2E", accent2: "#FFAE2B", background: "#15100D", card: "#23160F", foreground: "#FDECE0", radius: 16, surface: "glossy", hero: "spotlight", bg: "rays", font: "inter", displayFont: "montserrat", fontScale: 1.02, blur: 0, opacity: 100, depth: 70, glow: 68, dark: true, gradientButtons: true, hover3d: true, animations: true, pill: false }),
  royal: mk({ preset: "royal", primary: "#7C3AED", brand: "#986B0C", accent2: "#BC4AE6", background: "#1C1338", card: "#2A1D52", foreground: "#F4EFFA", radius: 16, surface: "glass", hero: "showcase", bg: "rays", font: "jakarta", displayFont: "playfair", fontScale: 1.02, blur: 24, opacity: 62, depth: 60, glow: 50, dark: true, gradientButtons: false, hover3d: true, animations: true, pill: false }),
  grape: mk({ preset: "grape", primary: "#7C3AED", brand: "#C41E9C", accent2: "#A32CD6", background: "#F5F0FE", card: "#FBF8FF", foreground: "#2D1B45", radius: 18, surface: "glass", hero: "spotlight", bg: "dots", font: "jakarta", displayFont: "jakarta", fontScale: 1, blur: 20, opacity: 70, depth: 32, glow: 28, dark: false, gradientButtons: true, hover3d: true, animations: true, pill: true }),
  emerald: mk({ preset: "emerald", primary: "#0E6F51", brand: "#A16207", accent2: "#2E9F76", background: "#F3F1E8", card: "#FAF8F1", foreground: "#21302A", radius: 18, surface: "neo", hero: "split", bg: "mesh", font: "manrope", displayFont: "playfair", fontScale: 1, blur: 0, opacity: 100, depth: 28, glow: 14, dark: false, gradientButtons: true, hover3d: false, animations: true, pill: false }),
  bubblegum: mk({ preset: "bubblegum", primary: "#D61F72", brand: "#7C3AED", accent2: "#E84FD0", background: "#FFF0F9", card: "#FDF2FA", foreground: "#3D1F47", radius: 24, surface: "clay", hero: "spotlight", bg: "dots", font: "jakarta", displayFont: "poppins", fontScale: 1.02, blur: 0, opacity: 100, depth: 45, glow: 32, dark: false, gradientButtons: true, hover3d: true, animations: true, pill: true }),
  "coral-reef": mk({ preset: "coral-reef", primary: "#0A8278", brand: "#D83B21", accent2: "#2CE0CF", background: "#E4FAF6", card: "#F4FEFD", foreground: "#0A2E33", radius: 20, surface: "glass", hero: "fullbleed", bg: "waves", font: "jakarta", displayFont: "poppins", fontScale: 1, blur: 22, opacity: 65, depth: 28, glow: 26, dark: false, gradientButtons: true, hover3d: true, animations: true, pill: true }),
  nordic: mk({ preset: "nordic", primary: "#3E6180", brand: "#26708A", accent2: "#3A7290", background: "#EDF1F6", card: "#FFFFFF", foreground: "#1B2A3A", radius: 12, surface: "elevated", hero: "minimal", bg: "solid", font: "manrope", displayFont: "manrope", fontScale: 1, blur: 0, opacity: 100, depth: 28, glow: 0, dark: false, gradientButtons: false, hover3d: false, animations: true, pill: false }),
  sakura: mk({ preset: "sakura", primary: "#DB2777", brand: "#CE4433", accent2: "#F76F8E", background: "#FFF1F4", card: "#FFFAFC", foreground: "#4A2130", radius: 24, surface: "clay", hero: "centered", bg: "dots", font: "poppins", displayFont: "poppins", fontScale: 1, blur: 0, opacity: 100, depth: 35, glow: 24, dark: false, gradientButtons: true, hover3d: true, animations: true, pill: true }),
  lagoon: mk({ preset: "lagoon", primary: "#0A7C8E", brand: "#0C8168", accent2: "#2BD9C4", background: "#04222C", card: "#0B3A46", foreground: "#E4F6F3", radius: 20, surface: "aurora", hero: "fullbleed", bg: "aurora", font: "manrope", displayFont: "space", fontScale: 1.02, blur: 24, opacity: 60, depth: 55, glow: 60, dark: true, gradientButtons: true, hover3d: true, animations: true, pill: false }),
  "golden-hour": mk({ preset: "golden-hour", primary: "#B0620C", brand: "#CD3D67", accent2: "#E8794A", background: "#FFF3E7", card: "#FFF9F1", foreground: "#3B2517", radius: 20, surface: "neo", hero: "showcase", bg: "gradient", font: "montserrat", displayFont: "montserrat", fontScale: 1.02, blur: 0, opacity: 100, depth: 38, glow: 26, dark: false, gradientButtons: true, hover3d: false, animations: true, pill: true }),
  obsidian: mk({ preset: "obsidian", primary: "#2E6DF6", brand: "#2563EB", accent2: "#38BDF8", background: "#0A0B0F", card: "#14161D", foreground: "#E6E9EF", radius: 12, surface: "glass", hero: "diagonal", bg: "noise", font: "inter", displayFont: "inter", fontScale: 0.98, blur: 14, opacity: 68, depth: 40, glow: 30, dark: true, gradientButtons: true, hover3d: false, animations: true, pill: false }),
  graphite: mk({ preset: "graphite", primary: "#9E6B2F", brand: "#A06326", accent2: "#C9924A", background: "#16181A", card: "#1E2124", foreground: "#ECEDEF", radius: 4, surface: "outline", hero: "split", bg: "grid", font: "space", displayFont: "space", fontScale: 1, blur: 0, opacity: 100, depth: 10, glow: 8, dark: true, gradientButtons: false, hover3d: false, animations: true, pill: false }),
};

export const PRESET_META: { key: string; label: string; desc: string; category: string }[] = [
  { key: "classic", label: "Classic", desc: "Clean, bright, elevated cards", category: "light" },
  { key: "glass", label: "Glass 3D", desc: "Glassmorphism + depth + mesh", category: "glass" },
  { key: "midnight", label: "Midnight", desc: "Dark glass, neon aurora", category: "dark" },
  { key: "ocean", label: "Ocean", desc: "Teal, calm, gradient", category: "light" },
  { key: "sunset", label: "Sunset", desc: "Warm coral, soft 3D", category: "vibrant" },
  { key: "minimal", label: "Minimal", desc: "Flat, monochrome, sharp", category: "minimal" },
  { key: "aurora", label: "Aurora Borealis", desc: "Luminous northern lights on glass", category: "glass" },
  { key: "neon", label: "Neon Circuit", desc: "High-voltage cyberpunk glow", category: "vibrant" },
  { key: "ember", label: "Ember Volcano", desc: "Molten heat forged in shadow", category: "dark" },
  { key: "royal", label: "Royal Velvet", desc: "Regal plum, amethyst & gold", category: "luxury" },
  { key: "grape", label: "Grape Soda", desc: "Fizzy violet meets magenta", category: "vibrant" },
  { key: "emerald", label: "Emerald Grove", desc: "Deep greens, gilded & calm", category: "nature" },
  { key: "bubblegum", label: "Bubblegum Pop", desc: "Playful hot-pink candy", category: "playful" },
  { key: "coral-reef", label: "Coral Reef", desc: "Vivid tropical reef glass", category: "vibrant" },
  { key: "nordic", label: "Nordic Slate", desc: "Cool Scandinavian steel", category: "minimal" },
  { key: "sakura", label: "Sakura Bloom", desc: "Soft blush, airy bloom", category: "playful" },
  { key: "lagoon", label: "Lagoon", desc: "Immersive deep-sea aqua glow", category: "glass" },
  { key: "golden-hour", label: "Golden Hour", desc: "Warm cozy sunset glow", category: "light" },
  { key: "obsidian", label: "Obsidian Pro", desc: "Sleek SaaS-grade dark mode", category: "dark" },
  { key: "graphite", label: "Graphite Editorial", desc: "Bronze-on-graphite luxe", category: "minimal" },
];

/** Merge any additional presets (e.g. generated gallery) into the registry + meta. */
export function registerPresets(extra: { key: string; label: string; desc: string; category: string; theme: Partial<Theme> }[]) {
  for (const e of extra) {
    THEME_PRESETS[e.key] = mk({ ...e.theme, preset: e.key });
    if (!PRESET_META.some((m) => m.key === e.key)) {
      PRESET_META.push({ key: e.key, label: e.label, desc: e.desc, category: e.category });
    }
  }
}

// Register the generated gallery (brings the library to 50+ presets).
registerPresets(EXTRA_PRESETS);

export const defaultTheme: Theme = THEME_PRESETS.classic;

/* ------------------------------------------------------------------ *
 * CSS generator
 * ------------------------------------------------------------------ */
const HEX = /^#?[0-9a-fA-F]{3,8}$/;
const FUNC = /^(rgb|rgba|hsl|hsla|oklch)\([0-9.,%\s/-]+\)$/i;
function safeColor(v: string, fallback: string): string {
  if (typeof v !== "string") return fallback;
  const t = v.trim();
  if (HEX.test(t)) return t.startsWith("#") ? t : "#" + t;
  if (FUNC.test(t)) return t;
  return fallback;
}
const clamp = (n: unknown, lo: number, hi: number, dflt: number) => {
  const x = Number(n);
  return Number.isFinite(x) ? Math.max(lo, Math.min(hi, x)) : dflt;
};
const mix = (c: string, pct: number, into: string) => `color-mix(in srgb, ${c} ${pct}%, ${into})`;

/** Page-background layers per bg style. `fixed` glow types stay put; patterns tile. */
function backgroundCss(theme: Theme, c: { primary: string; brand: string; accent2: string; bg: string; fg: string; dark: boolean }): string {
  const { primary, brand, accent2, bg, fg } = c;
  switch (theme.bg) {
    case "gradient":
      return `background-color:${bg};background-image:linear-gradient(160deg, ${mix(primary, 12, bg)}, ${bg} 55%, ${mix(brand, 8, bg)});background-attachment:fixed;`;
    case "mesh":
      return `background-color:${bg};background-image:radial-gradient(at 12% 10%, ${mix(primary, 26, "transparent")}, transparent 46%),radial-gradient(at 88% 8%, ${mix(brand, 22, "transparent")}, transparent 42%),radial-gradient(at 50% 96%, ${mix(accent2, 20, "transparent")}, transparent 52%);background-attachment:fixed;`;
    case "aurora":
      return `background-color:${bg};background-image:radial-gradient(60% 50% at 15% 0%, ${mix(primary, 40, "transparent")}, transparent 60%),radial-gradient(50% 45% at 85% 5%, ${mix(accent2, 38, "transparent")}, transparent 60%),radial-gradient(55% 55% at 50% 100%, ${mix(brand, 30, "transparent")}, transparent 62%);background-size:180% 180%;background-attachment:fixed;`;
    case "grid":
      return `background-color:${bg};background-image:linear-gradient(${mix(fg, 7, "transparent")} 1px, transparent 1px),linear-gradient(90deg, ${mix(fg, 7, "transparent")} 1px, transparent 1px);background-size:34px 34px;`;
    case "dots":
      return `background-color:${bg};background-image:radial-gradient(${mix(fg, 13, "transparent")} 1.4px, transparent 1.5px);background-size:22px 22px;`;
    case "waves":
      return `background-color:${bg};background-image:radial-gradient(130% 65% at 50% 118%, ${mix(primary, 24, "transparent")}, transparent 60%),repeating-linear-gradient(180deg, transparent 0 30px, ${mix(primary, 5, "transparent")} 30px 32px);background-attachment:fixed;`;
    case "rays":
      return `background-color:${bg};background-image:radial-gradient(60% 50% at 50% 0%, ${mix(primary, 22, "transparent")}, transparent 60%),repeating-conic-gradient(from 0deg at 50% -10%, ${mix(accent2, 9, "transparent")} 0deg 7deg, transparent 7deg 15deg);background-attachment:fixed;`;
    case "noise":
      return `background-color:${bg};background-image:linear-gradient(160deg, ${mix(primary, 8, bg)}, ${bg}),radial-gradient(${mix(fg, 5, "transparent")} 0.5px, transparent 0.6px);background-size:auto, 3px 3px;`;
    case "solid":
    default:
      return `background-color:${bg};`;
  }
}

/** Generate the CSS (no <style> tag) that themes the whole site via :root vars + #bf-root. */
export function themeToCss(theme: Theme): string {
  const primary = safeColor(theme.primary, "#29ABE2");
  const brand = safeColor(theme.brand, "#F26B4A");
  const accent2 = safeColor(theme.accent2, "#7C5CFC");
  const bg = safeColor(theme.background, "#ffffff");
  const card = safeColor(theme.card, "#ffffff");
  const fg = safeColor(theme.foreground, "#10233a");
  const radius = clamp(theme.radius, 0, 40, 12);
  const scale = clamp(theme.fontScale, 0.9, 1.15, 1);
  const blur = clamp(theme.blur, 0, 40, 16);
  const alpha = clamp(theme.opacity, 40, 100, 100) / 100;
  const depth = clamp(theme.depth, 0, 100, 42) / 100;
  const glow = clamp(theme.glow, 0, 100, 18) / 100;

  const body = FONT_STACK[theme.font] ?? FONT_STACK.inter;
  const display = FONT_STACK[theme.displayFont] ?? body;

  const bgCss = backgroundCss(theme, { primary, brand, accent2, bg, fg, dark: theme.dark });

  return `:root{
  --primary:${primary};--ring:${primary};--brand:${brand};--accent2:${accent2};
  --primary-foreground:#ffffff;--brand-foreground:#ffffff;
  --background:${bg};--foreground:${fg};
  --card:${card};--card-foreground:${fg};--popover:${card};--popover-foreground:${fg};
  --muted:${mix(fg, 6, bg)};
  --muted-foreground:${mix(fg, 55, bg)};
  --secondary:${mix(fg, 5, bg)};--secondary-foreground:${fg};
  --accent:${mix(primary, 14, bg)};--accent-foreground:${primary};
  --border:${mix(fg, 12, "transparent")};
  --input:${mix(fg, 14, "transparent")};
  --radius:${radius}px;
  --font-sans:${body};--font-display:${display};
  --bf-blur:${blur}px;--bf-alpha:${alpha};--bf-depth:${depth};--bf-glow:${glow};
  --bf-grad:linear-gradient(135deg, ${primary}, ${brand});
  --bf-grad3:linear-gradient(135deg, ${primary}, ${accent2} 55%, ${brand});
}
html{font-size:${(scale * 100).toFixed(2)}%;}
#bf-root{min-height:100vh;${bgCss}}
body{font-family:${body};}
#bf-root h1,#bf-root h2,#bf-root h3,#bf-root h4,#bf-root h5{font-family:${display};}`;
}
