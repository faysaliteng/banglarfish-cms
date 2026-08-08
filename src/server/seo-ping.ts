// Instant search-engine notification on publish/update via IndexNow (Bing, Yandex,
// Seznam, Naver — Google discovers through the sitemap). Best-effort, never throws.
export async function notifySearchEngines(paths: string[]): Promise<void> {
  try {
    const { getSeoConfig, getOrCreateIndexNowKey } = await import("./site-config");
    const seo = await getSeoConfig();
    if (!seo.indexNow || paths.length === 0) return;
    const base = (process.env.APP_URL || "").replace(/\/+$/, "");
    if (!base) return;
    const key = await getOrCreateIndexNowKey();
    const host = new URL(base).host;
    const urlList = paths.map((p) => base + (p.startsWith("/") ? p : "/" + p)).slice(0, 10000);
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ host, key, keyLocation: `${base}/${key}.txt`, urlList }),
      signal: AbortSignal.timeout(6000),
    }).catch(() => {});
  } catch {
    /* best-effort */
  }
}
