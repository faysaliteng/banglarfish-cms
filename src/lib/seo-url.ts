// SEO URL helpers. Safe in loaders (server) and components; on the client (where
// process.env.APP_URL is absent) they degrade to relative paths — crawlers read SSR.

export function siteBase(): string {
  const b = (typeof process !== "undefined" && process.env ? process.env.APP_URL : "") || "";
  return b.replace(/\/+$/, "");
}

// Absolute canonical URL for a path (leading slash optional).
export function canonicalUrl(path: string): string {
  const p = path.startsWith("/") ? path : "/" + path;
  const b = siteBase();
  return b ? b + p : p;
}

// Absolute URL for an asset path (e.g. /uploads/x.jpg -> https://site/uploads/x.jpg).
export function absoluteUrl(assetPath: string | undefined | null): string | undefined {
  if (!assetPath) return undefined;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  const b = siteBase();
  return b ? b + (assetPath.startsWith("/") ? assetPath : "/" + assetPath) : assetPath;
}
