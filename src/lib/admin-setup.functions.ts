import { createServerFn } from "@tanstack/react-start";

export type SetupStatus = {
  hasProducts: boolean;
  hasCategories: boolean;
  productCount: number;
  themeChosen: boolean;
  brandingSet: boolean;
  storeConfigured: boolean;
  deliverySet: boolean;
  paymentsReady: boolean;
};

export const adminSetupStatus = createServerFn({ method: "GET" }).handler(async (): Promise<SetupStatus> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { products, categories, settings } = await import("@/server/db/schema");
  const { count } = await import("drizzle-orm");
  await requireStaff();

  const [[p], [c], keyRows] = await Promise.all([
    db.select({ n: count() }).from(products),
    db.select({ n: count() }).from(categories),
    db.select({ key: settings.key }).from(settings),
  ]);
  const keys = new Set(keyRows.map((r) => r.key));

  let paymentsReady = true; // Cash on Delivery works out of the box
  try {
    const { getPaymentConfig } = await import("@/server/site-config");
    const pc = await getPaymentConfig();
    paymentsReady = pc.cod.enabled || pc.bkash.enabled || pc.nagad.enabled || pc.sslcommerz.enabled;
  } catch {
    /* keep default */
  }

  return {
    hasProducts: Number(p.n) > 0,
    hasCategories: Number(c.n) > 0,
    productCount: Number(p.n),
    themeChosen: keys.has("theme"),
    brandingSet: keys.has("branding"),
    storeConfigured: keys.has("store"),
    deliverySet: keys.has("delivery"),
    paymentsReady,
  };
});
