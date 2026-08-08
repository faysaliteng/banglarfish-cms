import { useSyncExternalStore } from "react";

export type CartLine = {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  image: string;
  /** Unit price INCLUDING any option price deltas. */
  price: number;
  weight: string;
  qty: number;
  isDigital?: boolean;
  /**
   * Chosen preparation options. Part of the line's identity: the same fish
   * ordered whole and family-cut are two different things to pack, so they must
   * not merge into one line just because the product and weight match.
   */
  options?: { group: string; choice: string; priceDelta: number }[];
};

/** Stable signature of everything that makes a line distinct. */
export function lineKey(l: Pick<CartLine, "productId" | "variantId" | "weight" | "options">): string {
  const opts = (l.options ?? []).map((o) => `${o.group}=${o.choice}`).sort().join("|");
  return `${l.productId}::${l.variantId ?? ""}::${l.weight}::${opts}`;
}

const KEY = "banglarfish_cart_v1";
type State = { lines: CartLine[] };

const listeners = new Set<() => void>();
let state: State = { lines: [] };

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
  } catch {}
}
function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

load();

export const cart = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get() {
    return state;
  },
  add(line: Omit<CartLine, "qty"> & { qty?: number }) {
    const qty = line.qty ?? 1;
    // Merge on the full identity, not just product + weight: the same fish
    // ordered whole and family-cut are two different jobs for the packer, and
    // collapsing them would lose one of the instructions entirely.
    const key = lineKey(line);
    const idx = state.lines.findIndex((l) => lineKey(l) === key);
    if (idx >= 0) state.lines[idx].qty += qty;
    else state.lines.push({ ...line, qty });
    state = { lines: [...state.lines] };
    persist();
  },
  setQty(key: string, qty: number) {
    state.lines = state.lines
      .map((l) => (lineKey(l) === key ? { ...l, qty } : l))
      .filter((l) => l.qty > 0);
    state = { lines: [...state.lines] };
    persist();
  },
  remove(key: string) {
    state.lines = state.lines.filter((l) => lineKey(l) !== key);
    state = { lines: [...state.lines] };
    persist();
  },
  clear() {
    state = { lines: [] };
    persist();
  },
};

export function useCart() {
  return useSyncExternalStore(
    (cb) => cart.subscribe(cb),
    () => cart.get(),
    () => ({ lines: [] }),
  );
}

/* ---------- Store pricing rules (shipping + tax) ---------- */
export type PricingConfig = { freeShippingThreshold: number; standardShipping: number; taxPercent: number };

// Mirrors the store settings so the cart/checkout preview matches what the
// server will charge. Set once at the app root (SSR + client), same as currency.
// The server remains authoritative — it also applies shipping zones, shipping
// classes and the tax engine, so this is a best-effort estimate.
let PRICING: PricingConfig = { freeShippingThreshold: 2000, standardShipping: 80, taxPercent: 0 };

export function setPricing(p: Partial<PricingConfig> | null | undefined) {
  if (!p) return;
  const n = (v: unknown, d: number) => (Number.isFinite(Number(v)) ? Number(v) : d);
  PRICING = {
    freeShippingThreshold: n(p.freeShippingThreshold, PRICING.freeShippingThreshold),
    standardShipping: n(p.standardShipping, PRICING.standardShipping),
    taxPercent: n(p.taxPercent, PRICING.taxPercent),
  };
}

export function getPricing(): PricingConfig {
  return PRICING;
}

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  // All-digital carts never ship (matches the authoritative server calculation).
  const allDigital = lines.length > 0 && lines.every((l) => l.isDigital);
  const freeOver = PRICING.freeShippingThreshold;
  const shipping =
    allDigital || subtotal === 0 ? 0 : freeOver > 0 && subtotal >= freeOver ? 0 : PRICING.standardShipping;
  const tax = Math.round((subtotal * PRICING.taxPercent) / 100);
  return { subtotal, shipping, tax, total: subtotal + shipping + tax };
}

/* ---------- Currency (global / multi-currency) ---------- */
export type CurrencyConfig = { code: string; symbol: string; position: "before" | "after"; decimals: number; thousandSep: string };

// Site-wide currency. A single store uses one currency, so a module-level value
// (set from Settings at the app root on both server + client) is safe.
let CURRENCY: CurrencyConfig = { code: "BDT", symbol: "৳", position: "before", decimals: 0, thousandSep: "," };

export function setCurrency(c: Partial<CurrencyConfig> | null | undefined) {
  if (!c) return;
  CURRENCY = {
    code: c.code || CURRENCY.code,
    symbol: c.symbol || CURRENCY.symbol,
    position: c.position === "after" ? "after" : "before",
    decimals: Number.isFinite(c.decimals) ? Math.max(0, Math.min(3, Number(c.decimals))) : CURRENCY.decimals,
    thousandSep: c.thousandSep ?? CURRENCY.thousandSep,
  };
}
export function getCurrency(): CurrencyConfig {
  return CURRENCY;
}

/**
 * Format an integer amount (stored in the currency's minor units when decimals>0,
 * e.g. cents; or whole units when decimals=0, e.g. BDT taka) as a display string.
 */
export function formatMoney(n: number): string {
  const { symbol, position, decimals, thousandSep } = CURRENCY;
  const raw = Number(n) || 0;
  const val = decimals > 0 ? raw / Math.pow(10, decimals) : raw;
  const neg = val < 0;
  const fixed = Math.abs(val).toFixed(decimals);
  const [ip, dp] = fixed.split(".");
  const grouped = ip.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep || ",");
  const num = (neg ? "-" : "") + grouped + (dp ? "." + dp : "");
  return position === "after" ? `${num} ${symbol}` : `${symbol}${num}`;
}

// Backwards-compatible alias — used throughout the app.
export const formatBDT = formatMoney;
