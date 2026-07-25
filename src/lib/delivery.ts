// Client-safe delivery-coverage logic (shared by signup completion, checkout,
// and the admin editor). No server imports.
import type { DeliveryConfig } from "./config-types";

export const defaultDeliveryConfig: DeliveryConfig = {
  enabled: false,
  message: "Sorry, we don't deliver to that area yet. We currently cover Dhaka city and nearby areas.",
  areas: [
    {
      id: "dhaka",
      name: "Dhaka City",
      terms: [
        "dhaka", "gulshan", "banani", "dhanmondi", "mirpur", "uttara", "mohammadpur",
        "bashundhara", "badda", "motijheel", "tejgaon", "rampura", "khilgaon", "mohakhali",
        "shyamoli", "farmgate", "malibagh", "jatrabari", "wari", "lalbagh", "kalabagan",
      ],
    },
  ],
};

export type CoverageInput = {
  city?: string | null;
  district?: string | null;
  address_line1?: string | null;
  postal_code?: string | null;
};

/** True if the address falls inside any covered area (or coverage is disabled). */
export function isAddressCovered(input: CoverageInput, cfg: DeliveryConfig): boolean {
  if (!cfg || !cfg.enabled) return true;
  const hay = [input.city, input.district, input.address_line1, input.postal_code]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!hay.trim()) return false;
  return cfg.areas.some((a) => a.terms.some((t) => t.trim() && hay.includes(t.trim().toLowerCase())));
}

export function coveredAreaNames(cfg: DeliveryConfig): string[] {
  return (cfg?.areas ?? []).map((a) => a.name).filter(Boolean);
}
