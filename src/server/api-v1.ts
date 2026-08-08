// Public REST API v1. Bearer API-key auth with scopes, JSON envelope, pagination.
// Mounted from api-router at /api/v1/*.
import { createHash } from "node:crypto";

export const API_SCOPES = ["read:products", "write:products", "read:orders", "write:orders", "read:content", "write:content", "read:customers"] as const;
export type ApiScope = (typeof API_SCOPES)[number];

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}
function err(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

async function authScopes(request: Request): Promise<{ ok: true; scopes: string[] } | { ok: false; res: Response }> {
  const auth = request.headers.get("authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  if (!m) return { ok: false, res: err("unauthorized", "Missing Bearer API key. Use: Authorization: Bearer <key>", 401) };
  const hash = createHash("sha256").update(m[1].trim()).digest("hex");
  const { db } = await import("./db");
  const { apiKeys } = await import("./db/schema");
  const { eq } = await import("drizzle-orm");
  const [key] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
  if (!key || !key.active) return { ok: false, res: err("unauthorized", "Invalid or revoked API key.", 401) };
  // Throttled last-used update (fire-and-forget).
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60_000) {
    void db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)).catch(() => {});
  }
  return { ok: true, scopes: key.scopes ?? [] };
}

export async function handleApiV1(request: Request, path: string): Promise<Response> {
  // OpenAPI spec is public (no key needed) so tooling can discover the API.
  if (path === "/api/v1/openapi.json") return json(openapi(request));

  const authed = await authScopes(request);
  if (!authed.ok) return authed.res;
  const scopes = authed.scopes;
  const need = (s: ApiScope) => scopes.includes(s) || scopes.includes("*");
  const url = new URL(request.url);
  const seg = path.replace(/^\/api\/v1\//, "").split("/").filter(Boolean);
  const method = request.method.toUpperCase();

  try {
    const { db } = await import("./db");
    const schema = await import("./db/schema");
    const { eq, desc, and, ilike, or } = await import("drizzle-orm");
    const { toProduct } = await import("./mappers");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 100);

    // /products
    if (seg[0] === "products") {
      if (method === "GET" && seg.length === 1) {
        if (!need("read:products")) return err("forbidden", "Requires scope read:products", 403);
        const q = url.searchParams.get("q");
        const where = q ? or(ilike(schema.products.name, `%${q}%`), ilike(schema.products.slug, `%${q}%`)) : undefined;
        const rows = await db.select().from(schema.products).where(where).orderBy(desc(schema.products.createdAt)).limit(limit).offset((page - 1) * limit);
        return json({ data: rows.map((r) => toProduct(r)), page, limit });
      }
      if (method === "GET" && seg.length === 2) {
        if (!need("read:products")) return err("forbidden", "Requires scope read:products", 403);
        const [row] = await db.select().from(schema.products).where(eq(schema.products.slug, seg[1])).limit(1);
        if (!row) return err("not_found", "Product not found", 404);
        const vars = await db.select().from(schema.productVariants).where(eq(schema.productVariants.productId, row.id));
        return json({ data: toProduct(row, vars) });
      }
      if (method === "POST" && seg.length === 1) {
        if (!need("write:products")) return err("forbidden", "Requires scope write:products", 403);
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (!body.slug || !body.name) return err("bad_request", "slug and name are required", 400);
        const [row] = await db.insert(schema.products).values({ slug: String(body.slug), name: String(body.name), price: Number(body.price) || 0, categorySlug: String(body.category || ""), description: String(body.description || ""), image: String(body.image || ""), stock: Number(body.stock) || 0 }).onConflictDoNothing({ target: schema.products.slug }).returning();
        if (!row) return err("conflict", "A product with that slug already exists", 409);
        return json({ data: toProduct(row) }, 201);
      }
    }

    // /categories
    if (seg[0] === "categories" && method === "GET") {
      if (!need("read:products")) return err("forbidden", "Requires scope read:products", 403);
      const rows = await db.select().from(schema.categories).where(eq(schema.categories.active, true));
      return json({ data: rows });
    }

    // /orders
    if (seg[0] === "orders" && method === "GET") {
      if (!need("read:orders")) return err("forbidden", "Requires scope read:orders", 403);
      if (seg.length === 2) {
        const [o] = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, seg[1])).limit(1);
        if (!o) return err("not_found", "Order not found", 404);
        return json({ data: o });
      }
      const rows = await db.select().from(schema.orders).orderBy(desc(schema.orders.createdAt)).limit(limit).offset((page - 1) * limit);
      return json({ data: rows, page, limit });
    }

    // /content/{blog|pages}
    if (seg[0] === "content" && method === "GET") {
      if (!need("read:content")) return err("forbidden", "Requires scope read:content", 403);
      if (seg[1] === "blog") {
        const rows = await db.select().from(schema.blogPosts).where(eq(schema.blogPosts.status, "published")).orderBy(desc(schema.blogPosts.publishedAt)).limit(limit);
        return json({ data: rows, page, limit });
      }
      if (seg[1] === "pages") {
        const rows = await db.select().from(schema.pages).where(eq(schema.pages.status, "published")).limit(limit);
        return json({ data: rows, page, limit });
      }
    }

    void and;
    return err("not_found", `No API route for ${method} /api/v1/${seg.join("/")}`, 404);
  } catch (e) {
    console.error("[api/v1]", e);
    return err("server_error", "Something went wrong", 500);
  }
}

function openapi(request: Request): Record<string, unknown> {
  const base = (process.env.APP_URL || new URL(request.url).origin).replace(/\/+$/, "");
  const okList = { "200": { description: "OK" } };
  return {
    openapi: "3.0.3",
    info: { title: "Banglarfish API", version: "1.0.0", description: "Public REST API. Auth: Authorization: Bearer <api-key>. Scopes: " + API_SCOPES.join(", ") },
    servers: [{ url: `${base}/api/v1` }],
    components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } },
    security: [{ bearerAuth: [] }],
    paths: {
      "/products": { get: { summary: "List products", responses: okList }, post: { summary: "Create product (write:products)", responses: { "201": { description: "Created" } } } },
      "/products/{slug}": { get: { summary: "Get product", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }], responses: okList } },
      "/categories": { get: { summary: "List categories", responses: okList } },
      "/orders": { get: { summary: "List orders (read:orders)", responses: okList } },
      "/orders/{number}": { get: { summary: "Get order", parameters: [{ name: "number", in: "path", required: true, schema: { type: "string" } }], responses: okList } },
      "/content/blog": { get: { summary: "List published blog posts", responses: okList } },
      "/content/pages": { get: { summary: "List published pages", responses: okList } },
    },
  };
}
