import { themeToCss } from "@/lib/theme-presets";
import type { Theme } from "@/lib/types";

// Custom CSS is authored by a manager+ in the admin Theme editor and injected
// inside a <style>. It can't break out of the tag or smuggle script: we strip
// tag-closers, HTML comment openers, and the handful of CSS vectors that run JS.
function sanitizeCustomCss(css: string): string {
  if (typeof css !== "string" || !css.trim()) return "";
  return css
    .replace(/<\s*\//gi, "")        // </style> and any tag close
    .replace(/<!--/g, "")           // conditional-comment tricks
    .replace(/-->/g, "")
    .replace(/javascript:/gi, "")   // url(javascript:…)
    .replace(/expression\s*\(/gi, "") // IE expression()
    .replace(/@import[^;]*;?/gi, "")  // external fetches
    .replace(/behavior\s*:/gi, "")    // IE behavior:
    .slice(0, 20000);
}

// Injects the active theme as :root CSS variables (SSR-rendered, so no flash).
// Colors are sanitized in themeToCss before interpolation.
export function ThemeStyle({ theme }: { theme: Theme }) {
  const css = themeToCss(theme);
  const custom = sanitizeCustomCss(theme.customCss ?? "");
  return (
    <>
      <style id="bf-theme" dangerouslySetInnerHTML={{ __html: css }} />
      {custom && <style id="bf-custom" dangerouslySetInnerHTML={{ __html: custom }} />}
    </>
  );
}
