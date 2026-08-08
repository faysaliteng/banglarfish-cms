// Raw HTTP routes handled before the SSR handler: robots.txt, sitemap.xml, and
// payment gateway callbacks. Returns a Response, or null to fall through to SSR.
import { and, eq, desc } from "drizzle-orm";

function baseUrl(request: Request): string {
  return process.env.APP_URL || new URL(request.url).origin;
}

// Redirect map with a 30s in-memory cache (avoids a DB hit per request).
let _redirCache: { at: number; map: Map<string, { to: string; code: number }> } | null = null;
async function redirectFor(path: string): Promise<{ to: string; code: number } | null> {
  const now = Date.now();
  if (!_redirCache || now - _redirCache.at > 30_000) {
    const map = new Map<string, { to: string; code: number }>();
    try {
      const { db } = await import("./db");
      const { redirects } = await import("./db/schema");
      const { eq } = await import("drizzle-orm");
      const rows = await db.select().from(redirects).where(eq(redirects.active, true));
      for (const r of rows) map.set((r.fromPath.replace(/\/+$/, "") || "/"), { to: r.toPath, code: r.code === 302 ? 302 : r.code === 410 ? 410 : 301 });
    } catch {
      /* keep last map */
    }
    _redirCache = { at: now, map };
  }
  return _redirCache.map.get(path.replace(/\/+$/, "") || "/") ?? null;
}

// Fire-and-forget hit counter for a matched redirect (never blocks the response).
async function bumpRedirectHit(fromKey: string): Promise<void> {
  try {
    const { db } = await import("./db");
    const { redirects } = await import("./db/schema");
    const { eq, sql } = await import("drizzle-orm");
    await db.update(redirects).set({ hits: sql`${redirects.hits} + 1` }).where(eq(redirects.fromPath, fromKey));
  } catch {
    /* ignore */
  }
}

// Liveness/readiness probe. The shallow form is public (status + DB reachability);
// detailed operational metrics require a token (?token= matching HEALTH_TOKEN) so we
// never leak queue depth / counts to anonymous callers.
async function healthCheck(request: Request): Promise<Response> {
  const started = Date.now();
  const out: Record<string, unknown> = { status: "ok", ts: new Date().toISOString() };
  let dbOk = false;
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (e) {
    out.status = "degraded";
    out.dbError = e instanceof Error ? e.message : "db error";
  }
  out.db = dbOk ? "up" : "down";
  out.latencyMs = Date.now() - started;
  try { out.uptimeS = Math.round(process.uptime()); } catch { /* non-node */ }

  const token = new URL(request.url).searchParams.get("token");
  const wantDetail = token && process.env.HEALTH_TOKEN && token === process.env.HEALTH_TOKEN;
  if (wantDetail) {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      const q = await db.execute(sql`SELECT status, count(*)::int AS n FROM jobs GROUP BY status`);
      const rows = (q as unknown as { rows?: { status: string; n: number }[] }).rows ?? (q as unknown as { status: string; n: number }[]);
      const jobs: Record<string, number> = {};
      for (const r of rows ?? []) jobs[r.status] = Number(r.n);
      out.jobs = jobs;
      const mem = process.memoryUsage();
      out.memoryMB = { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576) };
      out.node = process.version;
    } catch (e) {
      out.detailError = e instanceof Error ? e.message : "detail error";
    }
  }
  return new Response(JSON.stringify(out), {
    status: dbOk ? 200 : 503,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

// Maintenance mode (safe mode). Cached 10s so it costs ~nothing per request.
let _maintCache: { at: number; cfg: { enabled: boolean; message: string } } | null = null;
async function maintenanceGuard(request: Request, path: string): Promise<Response | null> {
  try {
    const now = Date.now();
    if (!_maintCache || now - _maintCache.at > 10_000) {
      const { getMaintenance } = await import("./site-config");
      _maintCache = { at: now, cfg: await getMaintenance() };
    }
    if (!_maintCache.cfg.enabled) return null;
    // Keep the escape hatches open: admin panel, auth, APIs, media, server fns.
    const allow = ["/admin", "/api", "/_serverFn", "/auth", "/media", "/complete-profile", "/favicon", "/robots.txt"];
    if (allow.some((a) => path === a || path.startsWith(a + "/") || path.startsWith(a))) return null;
    if (request.method !== "GET") return null;
    const msg = _maintCache.cfg.message || "We'll be back shortly.";
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Maintenance</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0b1220;color:#e5e7eb}.card{max-width:32rem;text-align:center;padding:2rem}.emoji{font-size:3rem}h1{font-size:1.5rem;margin:.5rem 0}p{color:#9ca3af;line-height:1.6}</style></head><body><div class="card"><div class="emoji">🛠️</div><h1>Under maintenance</h1><p>${msg.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c))}</p></div></body></html>`;
    return new Response(html, { status: 503, headers: { "content-type": "text/html; charset=utf-8", "retry-after": "300", "cache-control": "no-store" } });
  } catch {
    return null; // never let the guard take down the site
  }
}

// Sink for browser Content-Security-Policy violation reports (report-only mode).
// Rate-limited by simply logging; never persists unbounded data.
async function cspReport(request: Request): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  try {
    const body = await request.text();
    if (body) console.warn("[csp-report]", body.slice(0, 2000));
  } catch { /* ignore */ }
  return new Response(null, { status: 204 });
}

export async function handleApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  // Support sub-path deploys (e.g. /client1): strip the base before matching.
  const base = (process.env.APP_BASE_PATH || "").replace(/\/+$/, "");
  let path = url.pathname;
  if (base && (path === base || path.startsWith(base + "/"))) path = path.slice(base.length) || "/";

  // Admin-managed 301/302 redirects (skip admin/api so the panel stays reachable).
  if (!path.startsWith("/admin") && !path.startsWith("/api/") && !path.startsWith("/_serverFn")) {
    const red = await redirectFor(path);
    if (red) {
      void bumpRedirectHit(path.replace(/\/+$/, "") || "/");
      // 410 Gone: content permanently removed (tells search engines to deindex).
      if (red.code === 410) {
        const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>410 Gone</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0b1220;color:#e5e7eb}.c{max-width:32rem;text-align:center;padding:2rem}h1{font-size:1.5rem;margin:.5rem 0}p{color:#9ca3af}a{color:#60a5fa}</style></head><body><div class="c"><h1>410 — This page is gone</h1><p>The content you're looking for has been permanently removed. <a href="${baseUrl(request)}/">Return home</a>.</p></div></body></html>`;
        return new Response(html, { status: 410, headers: { "content-type": "text/html; charset=utf-8" } });
      }
      return Response.redirect(red.to.startsWith("http") ? red.to : `${baseUrl(request)}${red.to}`, red.code);
    }
  }

  if (path.startsWith("/api/v1/")) {
    const { handleApiV1 } = await import("./api-v1");
    return handleApiV1(request, path);
  }
  if (path === "/robots.txt") return robots(request);
  if (path === "/sitemap.xml") return sitemapIndex(request);
  if (path === "/sitemap-products.xml") return sitemapType(request, "products");
  if (path === "/sitemap-posts.xml") return sitemapType(request, "posts");
  if (path === "/sitemap-pages.xml") return sitemapType(request, "pages");
  if (path === "/sitemap-categories.xml") return sitemapType(request, "categories");
  if (path === "/sitemap-static.xml") return sitemapType(request, "static");
  if (path === "/rss.xml" || path === "/feed.xml") return rssFeed(request);
  if (path === "/media/tr") return mediaTransform(request);
  if (path === "/api/health" || path === "/healthz") return healthCheck(request);
  if (path === "/api/csp-report") return cspReport(request);

  // Maintenance / safe mode: serve a 503 page to storefront visitors while admins
  // (and API/auth) stay reachable so the site can be brought back online.
  const maint = await maintenanceGuard(request, path);
  if (maint) return maint;
  if (path.endsWith(".txt")) { const k = await indexNowKeyFile(path); if (k) return k; }
  if (path === "/api/payment/simulate/pay") return simulatePayPage(request);
  if (path.startsWith("/api/payment/")) return paymentCallback(request, path);
  if (path.startsWith("/api/auth/")) return oauthRoute(request, path);
  if (path.startsWith("/api/invoice/") && path.endsWith(".pdf")) return invoicePdfRoute(request, path);
  return null;
}

// Streams a real PDF invoice. Auth: owner of the order, or any staff member.
async function invoicePdfRoute(request: Request, path: string): Promise<Response> {
  const orderNumber = decodeURIComponent(path.slice("/api/invoice/".length).replace(/\.pdf$/, ""));
  if (!orderNumber) return new Response("Not found", { status: 404 });
  const { db } = await import("./db");
  const schema = await import("./db/schema");
  const { eq } = await import("drizzle-orm");
  const { createHash } = await import("node:crypto");

  const token = parseCookieHeader(request.headers.get("cookie") || "")["bf_session"];
  if (!token) return new Response("Please sign in to download this invoice.", { status: 401 });
  const id = createHash("sha256").update(token).digest("hex");
  const [sess] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
  if (!sess || (sess.expiresAt && sess.expiresAt.getTime() < Date.now())) return new Response("Session expired.", { status: 401 });
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, sess.userId)).limit(1);
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { loadInvoiceData, renderInvoicePdf } = await import("./invoice");
  const inv = await loadInvoiceData(orderNumber);
  if (!inv) return new Response("Order not found", { status: 404 });
  const isStaff = ["staff", "manager", "admin"].includes(user.role);
  if (!isStaff && inv.userId !== user.id) return new Response("You are not allowed to view this invoice.", { status: 403 });

  const pdf = await renderInvoicePdf(inv);
  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="invoice-${inv.order_number}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}

function parseCookieHeader(h: string): Record<string, string> {
  const out: Record<string, string> = {};
  h.split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

async function oauthRoute(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const b = baseUrl(request);
  const parts = path.split("/").filter(Boolean); // api, auth, <provider>, [callback]
  const provider = parts[2];
  const isCallback = parts[3] === "callback";
  if (provider !== "google" && provider !== "facebook") return new Response("Not found", { status: 404 });

  // Facebook app-management callbacks (needed to publish the app). Deauthorize is
  // pinged when a user removes the app; data-deletion returns the required JSON.
  if (provider === "facebook" && (parts[3] === "deauthorize" || parts[3] === "data-deletion")) {
    if (parts[3] === "data-deletion") {
      const { randomBytes } = await import("node:crypto");
      const code = randomBytes(8).toString("hex");
      return new Response(JSON.stringify({ url: `${b}/pages/privacy`, confirmation_code: code }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("OK", { status: 200 });
  }

  const redirectUri = `${b}/api/auth/${provider}/callback`;
  const { getAuthUrl, exchangeCode } = await import("./auth/oauth");
  const { randomBytes } = await import("node:crypto");
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";

  if (!isCallback) {
    const state = randomBytes(16).toString("hex");
    const next = url.searchParams.get("next") || "/account";
    const authUrl = await getAuthUrl(provider, redirectUri, state);
    if (!authUrl) return Response.redirect(`${b}/auth?error=oauth_disabled`, 302);
    const headers = new Headers({ Location: authUrl });
    headers.append("Set-Cookie", `bf_oauth_state=${state}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600;${secure}`);
    headers.append("Set-Cookie", `bf_oauth_next=${encodeURIComponent(next)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600;${secure}`);
    return new Response(null, { status: 302, headers });
  }

  // Callback
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookies = parseCookieHeader(request.headers.get("cookie") || "");
  if (!code || !state || cookies.bf_oauth_state !== state) return Response.redirect(`${b}/auth?error=oauth_state`, 302);

  const profile = await exchangeCode(provider, code, redirectUri);
  if (!profile) return Response.redirect(`${b}/auth?error=oauth_failed`, 302);

  const { db } = await import("./db");
  const { users } = await import("./db/schema");
  const { eq } = await import("drizzle-orm");
  const { hashPassword } = await import("./auth/password");
  const { createSessionRecord, sessionCookieString } = await import("./auth/session");

  const email = profile.email.toLowerCase();
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
    [user] = await db.insert(users).values({ email, fullName: profile.name, passwordHash, role: "customer", emailVerified: true, phoneVerified: false, phone: "" }).returning();
  }
  const { token } = await createSessionRecord(user.id);
  const next = decodeURIComponent(cookies.bf_oauth_next || "/account");
  const isStaff = ["staff", "manager", "admin"].includes(user.role);
  // New / phone-less accounts must complete their delivery profile first.
  const dest = !user.phone
    ? `/complete-profile?next=${encodeURIComponent(next)}`
    : isStaff && next === "/account" ? "/admin" : next;
  const headers = new Headers({ Location: `${b}${dest}` });
  headers.append("Set-Cookie", sessionCookieString(token));
  headers.append("Set-Cookie", "bf_oauth_state=; Path=/; Max-Age=0");
  headers.append("Set-Cookie", "bf_oauth_next=; Path=/; Max-Age=0");
  return new Response(null, { status: 302, headers });
}

async function robots(request: Request): Promise<Response> {
  const b = baseUrl(request);
  try {
    const { getSeoConfig } = await import("./site-config");
    const seo = await getSeoConfig();
    if (seo.noindexSite) {
      return new Response(`User-agent: *\nDisallow: /\n`, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    const custom = (seo.robotsTxt || "").trim();
    if (custom) {
      const body = custom.includes("Sitemap:") ? custom + "\n" : `${custom}\nSitemap: ${b}/sitemap.xml\n`;
      return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
  } catch {
    /* fall through to default */
  }
  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /account
Disallow: /checkout
Disallow: /cart
Disallow: /auth
Sitemap: ${b}/sitemap.xml
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

function xmlEsc(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type SUrl = { loc: string; lastmod?: string; priority?: string; changefreq?: string; image?: string };

function urlsetXml(urls: SUrl[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
    .map((u) => `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `<priority>${u.priority}</priority>` : ""}${u.image ? `<image:image><image:loc>${xmlEsc(u.image)}</image:loc></image:image>` : ""}</url>`)
    .join("\n")}
</urlset>`;
}

// Sitemap index: points to per-type sitemaps (Google/Bing prefer this at scale).
async function sitemapIndex(request: Request): Promise<Response> {
  const b = baseUrl(request);
  const kids = ["static", "products", "categories", "posts", "pages"].map((t) => `  <sitemap><loc>${b}/sitemap-${t}.xml</loc></sitemap>`).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${kids}
</sitemapindex>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}

async function sitemapType(request: Request, type: string): Promise<Response> {
  const b = baseUrl(request);
  const abs = (u: string) => (u?.startsWith("http") ? u : u?.startsWith("/") ? b + u : "");
  const urls: SUrl[] = [];
  try {
    const { db } = await import("./db");
    const { products, categories, pages, blogPosts } = await import("./db/schema");
    if (type === "static") {
      urls.push({ loc: `${b}/`, priority: "1.0", changefreq: "daily" }, { loc: `${b}/shop`, priority: "0.9", changefreq: "daily" }, { loc: `${b}/blog`, priority: "0.6", changefreq: "weekly" }, { loc: `${b}/recipes`, priority: "0.6", changefreq: "weekly" }, { loc: `${b}/contact`, priority: "0.4", changefreq: "yearly" });
    } else if (type === "products") {
      const rows = await db.select({ slug: products.slug, updatedAt: products.updatedAt, image: products.image, noindex: products.noindex }).from(products).where(eq(products.active, true));
      for (const p of rows) if (!p.noindex) urls.push({ loc: `${b}/product/${p.slug}`, lastmod: p.updatedAt.toISOString(), priority: "0.8", changefreq: "weekly", image: abs(p.image) });
    } else if (type === "categories") {
      const rows = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.active, true));
      for (const c of rows) urls.push({ loc: `${b}/category/${c.slug}`, priority: "0.7", changefreq: "weekly" });
    } else if (type === "pages") {
      const rows = await db.select({ slug: pages.slug, updatedAt: pages.updatedAt, noindex: pages.noindex }).from(pages).where(eq(pages.status, "published"));
      for (const p of rows) if (!p.noindex) urls.push({ loc: `${b}/pages/${p.slug}`, lastmod: p.updatedAt.toISOString(), priority: "0.5", changefreq: "monthly" });
    } else if (type === "posts") {
      const rows = await db.select({ slug: blogPosts.slug, publishedAt: blogPosts.publishedAt, noindex: blogPosts.noindex }).from(blogPosts).where(eq(blogPosts.status, "published"));
      for (const p of rows) if (!p.noindex) urls.push({ loc: `${b}/blog/${p.slug}`, lastmod: p.publishedAt?.toISOString(), priority: "0.6", changefreq: "monthly" });
    }
  } catch {
    /* empty urlset on failure */
  }
  return new Response(urlsetXml(urls), { headers: { "content-type": "application/xml; charset=utf-8" } });
}

// On-the-fly image transform: /media/tr?src=/uploads/x.jpg&w=800&f=webp
// Resizes + reformats with sharp, caches the result to disk, serves immutable.
async function mediaTransform(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const src = url.searchParams.get("src") || "";
    const w = Math.min(Math.max(parseInt(url.searchParams.get("w") || "0", 10) || 0, 0), 2400);
    const fmt = (url.searchParams.get("f") || "webp").toLowerCase();
    const format = ["webp", "avif", "jpeg", "png"].includes(fmt) ? fmt : "webp";
    if (!src.startsWith("/uploads/") && !src.startsWith("/img/")) return new Response("Bad source", { status: 400 });
    if (src.includes("..")) return new Response("Bad source", { status: 400 });

    const path = await import("node:path");
    const { readFile, writeFile, mkdir, stat } = await import("node:fs/promises");
    const cwd = process.cwd();
    const uploadDir = process.env.UPLOAD_DIR || path.join(cwd, "public", "uploads");
    const rel = src.replace(/^\/(uploads|img)\//, "");
    // Resolve against candidate base dirs (source public + built .output/public).
    const bases = src.startsWith("/uploads/")
      ? [uploadDir, path.join(cwd, "public", "uploads"), path.join(cwd, ".output", "public", "uploads")]
      : [path.join(cwd, "public", "img"), path.join(cwd, ".output", "public", "img")];
    let srcPath = "";
    for (const base of bases) {
      const cand = path.resolve(base, rel);
      if (!cand.startsWith(path.resolve(base))) continue; // traversal guard
      try { await stat(cand); srcPath = cand; break; } catch { /* try next */ }
    }
    if (!srcPath) return new Response("Not found", { status: 404 });

    const { createHash } = await import("node:crypto");
    const key = createHash("sha1").update(`${src}|${w}|${format}`).digest("hex");
    const cacheDir = path.join(uploadDir, "_cache");
    const outPath = path.join(cacheDir, `${key}.${format}`);
    const ct = format === "avif" ? "image/avif" : format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";

    let out: Buffer;
    try {
      await stat(outPath);
      out = await readFile(outPath);
    } catch {
      const input = await readFile(srcPath);
      const sharp = (await import("sharp")).default;
      let pipe = sharp(input, { failOn: "none" }).rotate();
      if (w > 0) pipe = pipe.resize({ width: w, withoutEnlargement: true });
      if (format === "avif") pipe = pipe.avif({ quality: 55 });
      else if (format === "png") pipe = pipe.png();
      else if (format === "jpeg") pipe = pipe.jpeg({ quality: 78, mozjpeg: true });
      else pipe = pipe.webp({ quality: 78 });
      out = await pipe.toBuffer();
      await mkdir(cacheDir, { recursive: true });
      await writeFile(outPath, out).catch(() => {});
    }
    return new Response(new Uint8Array(out), { headers: { "content-type": ct, "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Transform failed", { status: 500 });
  }
}

// Serve the IndexNow key verification file at /{key}.txt.
async function indexNowKeyFile(path: string): Promise<Response | null> {
  const m = /^\/([a-f0-9]{16,64})\.txt$/i.exec(path);
  if (!m) return null;
  try {
    const { getSeoConfig } = await import("./site-config");
    const seo = await getSeoConfig();
    if (seo.indexNowKey && seo.indexNowKey === m[1]) return new Response(seo.indexNowKey, { headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch {
    /* ignore */
  }
  return null;
}

async function rssFeed(request: Request): Promise<Response> {
  const b = baseUrl(request);
  let siteName = "Blog";
  const items: string[] = [];
  try {
    const { db } = await import("./db");
    const { blogPosts } = await import("./db/schema");
    const { getSeoConfig } = await import("./site-config");
    siteName = (await getSeoConfig()).siteName || siteName;
    const posts = await db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt)).limit(30);
    for (const p of posts) {
      const date = (p.publishedAt ?? p.createdAt).toUTCString();
      items.push(`    <item><title>${xmlEsc(p.title)}</title><link>${b}/blog/${p.slug}</link><guid isPermaLink="true">${b}/blog/${p.slug}</guid><pubDate>${date}</pubDate>${p.category ? `<category>${xmlEsc(p.category)}</category>` : ""}<description>${xmlEsc(p.excerpt || "")}</description></item>`);
    }
  } catch {
    /* empty feed */
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>${xmlEsc(siteName)}</title>
    <link>${b}/blog</link>
    <description>${xmlEsc(siteName)} — latest articles</description>
${items.join("\n")}
</channel></rss>`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}

function simulatePayPage(request: Request): Response {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const provider = url.searchParams.get("provider") ?? "gateway";
  const tran = url.searchParams.get("tran") ?? "";
  const b = baseUrl(request);
  const success = `${b}/api/payment/${provider}/success?order=${encodeURIComponent(order)}&tran=${encodeURIComponent(tran)}`;
  const cancel = `${b}/api/payment/${provider}/cancel?order=${encodeURIComponent(order)}`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sandbox payment</title>
<style>body{font:15px/1.6 system-ui,sans-serif;background:#eef5fb;display:grid;place-items:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:16px;padding:28px;max-width:380px;box-shadow:0 12px 40px -12px rgba(0,0,0,.2);text-align:center}
.b{display:inline-block;padding:12px 22px;border-radius:10px;font-weight:600;text-decoration:none;margin:6px}
.pay{background:#29ABE2;color:#fff}.cancel{background:#eee;color:#333}</style></head>
<body><div class="card"><h2>Sandbox ${provider} payment</h2>
<p>Order <b>#${order}</b></p><p style="color:#666">This is a simulated gateway (PAYMENT_MODE=simulate). Wire real credentials to go live.</p>
<a class="b pay" href="${success}">Pay now ✓</a><a class="b cancel" href="${cancel}">Cancel</a></div></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

async function paymentCallback(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const b = baseUrl(request);
  const parts = path.split("/").filter(Boolean); // api, payment, <provider>, <action>
  const provider = parts[2] ?? "";
  const action = parts[3] ?? "success";

  let body: Record<string, string> = {};
  if (request.method === "POST") {
    try {
      const text = await request.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } catch {
      /* ignore */
    }
  }

  try {
    const { verifyPayment } = await import("./payments");
    const result = await verifyPayment(provider, action, url.searchParams, body);
    if (result.orderNumber) {
      const { db } = await import("./db");
      const { orders, payments, orderStatusHistory } = await import("./db/schema");
      const [order] = await db.select().from(orders).where(eq(orders.orderNumber, result.orderNumber)).limit(1);
      if (order) {
        // Idempotency + replay guard: a gateway may re-deliver the same callback/IPN
        // (or an attacker may replay it). Once an order is paid we never re-process,
        // never re-send confirmation, and never insert a duplicate payment row.
        const alreadyPaid = order.paymentStatus === "paid";
        // Also dedupe by transaction id — a repeated success with the same tx is a no-op.
        let dupTxn = false;
        if (result.transactionId) {
          const [existing] = await db.select({ id: payments.id }).from(payments).where(and(eq(payments.orderId, order.id), eq(payments.transactionId, result.transactionId), eq(payments.status, "paid"))).limit(1);
          dupTxn = !!existing;
        }
        if (result.status === "paid" && !alreadyPaid && !dupTxn) {
          await db.update(orders).set({ paymentStatus: "paid", status: order.status === "pending" ? "confirmed" : order.status, transactionId: result.transactionId ?? null, updatedAt: new Date() }).where(eq(orders.id, order.id));
          await db.insert(orderStatusHistory).values({ orderId: order.id, status: "confirmed", note: `Payment received via ${provider}` });
          const { sendOrderConfirmation, sendOrderConfirmationEmail, sendOrderConfirmationWhatsApp } = await import("./notify");
          void sendOrderConfirmation(order.phone, order.orderNumber, order.total, true);
          void sendOrderConfirmationEmail(order.email, { orderNumber: order.orderNumber, total: order.total, items: (order.items ?? []) as { name: string; qty: number }[] }, true);
          void sendOrderConfirmationWhatsApp(order.phone, order.orderNumber, order.total, true);
          await db.insert(payments).values({ orderId: order.id, orderNumber: order.orderNumber, provider, amount: order.total, status: "paid", transactionId: result.transactionId ?? null, raw: result.raw ?? null });
          try { const { emit } = await import("./events"); void emit("order.paid", { orderId: order.id, orderNumber: order.orderNumber, total: order.total, provider }); } catch { /* ignore */ }
        } else if (result.status === "failed" && !alreadyPaid) {
          await db.update(orders).set({ paymentStatus: "failed", updatedAt: new Date() }).where(eq(orders.id, order.id));
          await db.insert(payments).values({ orderId: order.id, orderNumber: order.orderNumber, provider, amount: order.total, status: "failed", transactionId: result.transactionId ?? null, raw: result.raw ?? null });
        }
        // alreadyPaid || dupTxn → intentional no-op (safe replay).
      }
    }
    if (action === "ipn") return new Response("OK");
    const dest = result.status === "paid" ? `/order-confirmed?id=${encodeURIComponent(result.orderNumber ?? "")}` : `/checkout?payment=${result.status}`;
    return Response.redirect(b + dest, 302);
  } catch (e) {
    console.error("[payment callback]", e);
    return Response.redirect(b + "/checkout?payment=error", 302);
  }
}

void and;
void desc;
