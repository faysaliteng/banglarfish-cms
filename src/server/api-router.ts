// Raw HTTP routes handled before the SSR handler: robots.txt, sitemap.xml, and
// payment gateway callbacks. Returns a Response, or null to fall through to SSR.
import { and, eq, desc } from "drizzle-orm";

function baseUrl(request: Request): string {
  return process.env.APP_URL || new URL(request.url).origin;
}

export async function handleApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  // Support sub-path deploys (e.g. /client1): strip the base before matching.
  const base = (process.env.APP_BASE_PATH || "").replace(/\/+$/, "");
  let path = url.pathname;
  if (base && (path === base || path.startsWith(base + "/"))) path = path.slice(base.length) || "/";

  if (path === "/robots.txt") return robots(request);
  if (path === "/sitemap.xml") return sitemap(request);
  if (path === "/rss.xml" || path === "/feed.xml") return rssFeed(request);
  if (path === "/api/payment/simulate/pay") return simulatePayPage(request);
  if (path.startsWith("/api/payment/")) return paymentCallback(request, path);
  if (path.startsWith("/api/auth/")) return oauthRoute(request, path);
  return null;
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

function robots(request: Request): Response {
  const b = baseUrl(request);
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

async function sitemap(request: Request): Promise<Response> {
  const b = baseUrl(request);
  const abs = (u: string) => (u?.startsWith("http") ? u : u?.startsWith("/") ? b + u : "");
  type U = { loc: string; lastmod?: string; priority?: string; changefreq?: string; image?: string };
  const urls: U[] = [
    { loc: `${b}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${b}/shop`, priority: "0.9", changefreq: "daily" },
    { loc: `${b}/blog`, priority: "0.6", changefreq: "weekly" },
    { loc: `${b}/recipes`, priority: "0.6", changefreq: "weekly" },
  ];
  try {
    const { db } = await import("./db");
    const { products, categories, pages, blogPosts } = await import("./db/schema");
    const prods = await db.select({ slug: products.slug, updatedAt: products.updatedAt, image: products.image }).from(products).where(eq(products.active, true));
    for (const p of prods) urls.push({ loc: `${b}/product/${p.slug}`, lastmod: p.updatedAt.toISOString(), priority: "0.8", changefreq: "weekly", image: abs(p.image) });
    const cats = await db.select({ slug: categories.slug }).from(categories).where(eq(categories.active, true));
    for (const c of cats) urls.push({ loc: `${b}/category/${c.slug}`, priority: "0.7", changefreq: "weekly" });
    const pgs = await db.select({ slug: pages.slug, updatedAt: pages.updatedAt }).from(pages).where(eq(pages.status, "published"));
    for (const p of pgs) urls.push({ loc: `${b}/pages/${p.slug}`, lastmod: p.updatedAt.toISOString(), priority: "0.5", changefreq: "monthly" });
    const posts = await db.select({ slug: blogPosts.slug, publishedAt: blogPosts.publishedAt }).from(blogPosts).where(eq(blogPosts.status, "published"));
    for (const p of posts) urls.push({ loc: `${b}/blog/${p.slug}`, lastmod: p.publishedAt?.toISOString(), priority: "0.6", changefreq: "monthly" });
  } catch {
    /* fall through with static urls */
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls
    .map((u) => `  <url><loc>${xmlEsc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ""}${u.priority ? `<priority>${u.priority}</priority>` : ""}${u.image ? `<image:image><image:loc>${xmlEsc(u.image)}</image:loc></image:image>` : ""}</url>`)
    .join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
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
        if (result.status === "paid") {
          await db.update(orders).set({ paymentStatus: "paid", status: order.status === "pending" ? "confirmed" : order.status, transactionId: result.transactionId ?? null, updatedAt: new Date() }).where(eq(orders.id, order.id));
          await db.insert(orderStatusHistory).values({ orderId: order.id, status: "confirmed", note: `Payment received via ${provider}` });
          const { sendOrderConfirmation } = await import("./notify");
          void sendOrderConfirmation(order.phone, order.orderNumber, order.total, true);
        } else if (result.status === "failed") {
          await db.update(orders).set({ paymentStatus: "failed", updatedAt: new Date() }).where(eq(orders.id, order.id));
        }
        await db.insert(payments).values({ orderId: order.id, orderNumber: order.orderNumber, provider, amount: order.total, status: result.status, transactionId: result.transactionId ?? null, raw: result.raw ?? null });
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
