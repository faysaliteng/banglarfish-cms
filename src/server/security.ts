// IP extraction, ban enforcement (cached), device detection, optional geo lookup.
import { eq } from "drizzle-orm";
import { db } from "./db";
import { bannedIps } from "./db/schema";

export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "";
}

export function deviceType(ua: string | null): string {
  if (!ua) return "unknown";
  const s = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|bingpreview/.test(s)) return "bot";
  if (/mobile|iphone|android.*mobile|windows phone/.test(s)) return "mobile";
  if (/ipad|tablet|android(?!.*mobile)/.test(s)) return "tablet";
  return "desktop";
}

/* ---- Banned-IP cache (refreshed periodically to avoid a DB hit per request) ---- */
const globalForBans = globalThis as unknown as { __bfBans?: { set: Set<string>; at: number } };
const TTL = 20_000;

async function loadBans(): Promise<Set<string>> {
  const rows = await db.select({ ip: bannedIps.ip }).from(bannedIps);
  return new Set(rows.map((r) => r.ip));
}

export async function isBanned(ip: string): Promise<boolean> {
  if (!ip) return false;
  try {
    const cache = globalForBans.__bfBans;
    // Note: Date.now is fine in the running server (only the workflow sandbox forbids it).
    const now = Date.now();
    if (!cache || now - cache.at > TTL) {
      const set = await loadBans();
      globalForBans.__bfBans = { set, at: now };
      return set.has(ip);
    }
    return cache.set.has(ip);
  } catch {
    return false; // never block traffic because the ban check failed
  }
}

export function invalidateBanCache() {
  globalForBans.__bfBans = undefined;
}

/* ---- In-memory sliding-window rate limiter (per-process) ---- */
const globalForRl = globalThis as unknown as { __bfRl?: Map<string, number[]> };

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const store = (globalForRl.__bfRl ??= new Map<string, number[]>());
  const now = Date.now();
  const hits = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    store.set(key, hits);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > 5000) for (const [k, v] of store) if (v.every((t) => now - t > windowMs)) store.delete(k);
  return { ok: true, retryAfter: 0 };
}

// Throttle by client IP for the current request; throws a friendly error when exceeded.
// Call from inside a server-function handler (dynamic-imported so it stays server-only).
export async function rateLimitRequest(bucket: string, max: number, windowMs: number, extraKey = ""): Promise<void> {
  let ip = "unknown";
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (req) ip = clientIp(req) || "unknown";
  } catch {
    /* no request context — skip */
  }
  const res = rateLimit(`${bucket}:${ip}${extraKey ? ":" + extraKey : ""}`, max, windowMs);
  if (!res.ok) throw new Error(`Too many attempts. Please wait ${res.retryAfter}s and try again.`);
}

/* ---- Optional geo lookup (opt-in via GEOIP_ENDPOINT, e.g. http://ip-api.com/json/{ip}) ---- */
export async function geoLookup(ip: string): Promise<{ country?: string; city?: string }> {
  const endpoint = process.env.GEOIP_ENDPOINT;
  if (!endpoint || !ip || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip === "::1") return {};
  try {
    const res = await fetch(endpoint.replace("{ip}", encodeURIComponent(ip)), { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return {};
    const j = (await res.json()) as Record<string, string>;
    return { country: j.country || j.country_name, city: j.city };
  } catch {
    return {};
  }
}
