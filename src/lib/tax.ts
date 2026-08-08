import type { TaxConfig } from "./config-types";

// A single order line reduced to what the tax engine needs.
export type TaxableLine = { taxClass: string; amount: number }; // amount = taxable base (after discount)
export type TaxResult = { total: number; byRate: { name: string; amount: number }[] };

function regionMatches(region: string, address: string): boolean {
  const r = (region || "").trim().toLowerCase();
  if (!r || r === "*") return true;
  return address.toLowerCase().includes(r);
}

// WooCommerce-style tax computation: per-line, per-class, region-aware, with
// priority ordering and compound rates. Amounts are rounded to whole units.
export function computeTax(lines: TaxableLine[], cfg: TaxConfig, address: string): TaxResult {
  if (!cfg.enabled || cfg.rates.length === 0) return { total: 0, byRate: [] };
  const byRate = new Map<string, number>();
  let total = 0;
  for (const line of lines) {
    const cls = line.taxClass || "standard";
    const rates = cfg.rates
      .filter((rt) => rt.classId === cls && regionMatches(rt.region, address))
      .sort((a, b) => a.priority - b.priority);
    let running = line.amount;
    for (const rt of rates) {
      const base = rt.compound ? running : line.amount;
      const amt = cfg.pricesIncludeTax
        ? Math.round(base - base / (1 + rt.rate / 100)) // extract tax from an inclusive price
        : Math.round((base * rt.rate) / 100);
      total += amt;
      running += amt;
      byRate.set(rt.name, (byRate.get(rt.name) ?? 0) + amt);
    }
  }
  return { total, byRate: [...byRate].map(([name, amount]) => ({ name, amount })) };
}
