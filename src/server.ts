import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

// Start the kernel: durable job worker + recurring scheduler + plugin registry.
void import("./server/jobs").then((m) => m.startWorker()).catch((e) => console.error("[kernel] worker start failed", e));
void import("./server/plugins").then((m) => m.bootPlugins()).catch((e) => console.error("[kernel] plugin boot failed", e));
void import("./server/webhooks").then((m) => m.wireWebhooks()).catch((e) => console.error("[kernel] webhook wiring failed", e));
void import("./server/fulfillment").then((m) => m.wireFulfillment()).catch((e) => console.error("[kernel] fulfillment wiring failed", e));

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// In-memory micro-cache for anonymous HTML (absorbs traffic spikes; ~5s TTL).
const HTML_CACHE = new Map<string, { body: string; ct: string; at: number }>();
const MICRO_TTL = 5000;

function microCacheable(request: Request, path: string): boolean {
  if (request.method !== "GET") return false;
  const cookie = request.headers.get("cookie") || "";
  if (cookie.includes("bf_session") || cookie.includes("bf_lang")) return false; // personalized / localized
  const skip = ["/admin", "/api", "/_serverFn", "/cart", "/checkout", "/account", "/auth", "/complete-profile", "/media/", "/order-confirmed"];
  return !skip.some((s) => path.startsWith(s));
}

// Baseline security headers applied to every response (defense-in-depth at the app
// layer, so it survives even if the edge proxy config is not hardened).
function withSecurityHeaders(request: Request, response: Response): Response {
  try {
    const h = new Headers(response.headers);
    if (!h.has("X-Content-Type-Options")) h.set("X-Content-Type-Options", "nosniff");
    if (!h.has("X-Frame-Options")) h.set("X-Frame-Options", "SAMEORIGIN");
    if (!h.has("Referrer-Policy")) h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!h.has("Permissions-Policy")) h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()");
    if (!h.has("X-XSS-Protection")) h.set("X-XSS-Protection", "0");
    // HSTS only over HTTPS (proto from the terminating proxy).
    const proto = request.headers.get("x-forwarded-proto") || (new URL(request.url).protocol === "https:" ? "https" : "http");
    if (proto === "https" && !h.has("Strict-Transport-Security")) h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
    // Report-only CSP: establishes a violation-reporting channel + a documented
    // baseline without risking breakage. 'unsafe-inline' is required by the SSR
    // hydration payload; tightening to nonces is a follow-up. Applied to HTML only.
    const ct = h.get("content-type") || "";
    if (ct.includes("text/html") && !h.has("Content-Security-Policy-Report-Only")) {
      const base = (process.env.APP_BASE_PATH || "").replace(/\/+$/, "");
      h.set("Content-Security-Policy-Report-Only", [
        "default-src 'self'",
        "img-src 'self' data: blob: https:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        "frame-ancestors 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        `report-uri ${base}/api/csp-report`,
      ].join("; "));
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: h });
  } catch {
    return response; // never let header hardening break a response
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Block banned IPs early (cached lookup; never blocks on failure).
      try {
        const { clientIp, isBanned } = await import("./server/security");
        const ip = clientIp(request);
        if (ip && (await isBanned(ip))) {
          return new Response("Access denied.", { status: 403, headers: { "content-type": "text/plain" } });
        }
      } catch {
        /* security layer must never take down the site */
      }

      // Raw HTTP routes (robots, sitemap, payment callbacks) before SSR.
      try {
        const { handleApi } = await import("./server/api-router");
        const apiResponse = await handleApi(request);
        if (apiResponse) return withSecurityHeaders(request, apiResponse);
      } catch (e) {
        console.error("[api-router]", e);
      }

      // Anonymous HTML micro-cache (serve identical anonymous pages from memory).
      const reqPath = new URL(request.url).pathname;
      const canCache = microCacheable(request, reqPath);
      if (canCache) {
        const hit = HTML_CACHE.get(request.url);
        if (hit && Date.now() - hit.at < MICRO_TTL) {
          return withSecurityHeaders(request, new Response(hit.body, { headers: { "content-type": hit.ct, "x-cache": "HIT" } }));
        }
      }

      const handler = await getServerEntry();
      const response = withSecurityHeaders(request, await normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx)));

      // Buffer + cache successful anonymous HTML.
      if (canCache && response.status === 200 && (response.headers.get("content-type") || "").includes("text/html")) {
        try {
          const body = await response.clone().text();
          const ct = response.headers.get("content-type") || "text/html; charset=utf-8";
          HTML_CACHE.set(request.url, { body, ct, at: Date.now() });
          if (HTML_CACHE.size > 500) { const now = Date.now(); for (const [k, v] of HTML_CACHE) if (now - v.at > MICRO_TTL) HTML_CACHE.delete(k); }
        } catch { /* streaming body — skip cache */ }
      }
      return response;
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(request, new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      }));
    }
  },
};
