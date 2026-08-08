// Applies the admin-configured title templates from Admin → SEO Engine.
// Templates use %page% (the page's own title) and %site% (the site name), e.g.
//   "%page% — %site%"   →  "Chandpur Hilsa — Banglarfish"
// Without this the templates were dead config: every page hardcoded its suffix.
export function renderTitle(template: string | undefined, page: string, site: string): string {
  const fallback = `${page} — ${site}`.trim();
  if (!template || !template.includes("%page%")) return fallback;
  return template.replace(/%page%/g, page).replace(/%site%/g, site).trim();
}
