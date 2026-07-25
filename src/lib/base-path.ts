// Prefix an internal absolute path with the deploy base path (e.g. /client1) for
// raw browser navigations (window.location) that bypass the router. No-op when
// deployed at the domain root. External URLs (http/https) pass through unchanged.
export function withBase(path: string): string {
  const base = (import.meta.env.VITE_BASE_PATH || "").replace(/\/+$/, "");
  if (!base) return path;
  if (/^https?:\/\//i.test(path)) return path;
  if (path === base || path.startsWith(base + "/")) return path;
  return base + (path.startsWith("/") ? path : "/" + path);
}
