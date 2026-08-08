import { useSyncExternalStore } from "react";

export type CartLine = {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  image: string;
  price: number;
  weight: string;
  qty: number;
  isDigital?: boolean;
};

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
    const idx = state.lines.findIndex(
      (l) => l.productId === line.productId && l.weight === line.weight,
    );
    if (idx >= 0) state.lines[idx].qty += qty;
    else state.lines.push({ ...line, qty });
    state = { lines: [...state.lines] };
    persist();
  },
  setQty(productId: string, weight: string, qty: number) {
    state.lines = state.lines
      .map((l) =>
        l.productId === productId && l.weight === weight ? { ...l, qty } : l,
      )
      .filter((l) => l.qty > 0);
    state = { lines: [...state.lines] };
    persist();
  },
  remove(productId: string, weight: string) {
    state.lines = state.lines.filter(
      (l) => !(l.productId === productId && l.weight === weight),
    );
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

export function cartTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  // All-digital carts never ship (matches the authoritative server calculation).
  const allDigital = lines.length > 0 && lines.every((l) => l.isDigital);
  const shipping = allDigital || subtotal === 0 ? 0 : subtotal >= 2000 ? 0 : 80;
  return { subtotal, shipping, total: subtotal + shipping };
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
