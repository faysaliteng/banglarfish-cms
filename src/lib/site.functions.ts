import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PaymentConfig, SmsConfig, SeoConfig, SocialConfig, BrandingConfig, DeliveryConfig, CustomCodeConfig } from "./config-types";

/* ---------------- Branding ---------------- */
export const getBranding = createServerFn({ method: "GET" }).handler(async (): Promise<BrandingConfig> => {
  try {
    const { getBrandingConfig } = await import("@/server/site-config");
    return await getBrandingConfig();
  } catch {
    const { getBrandingConfig } = await import("@/server/site-config");
    return getBrandingConfig();
  }
});

export const adminGetBranding = createServerFn({ method: "GET" }).handler(async (): Promise<BrandingConfig> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { getBrandingConfig } = await import("@/server/site-config");
  await requireStaff();
  return getBrandingConfig();
});

export const adminSaveBranding = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as BrandingConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveBrandingConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveBrandingConfig(data);
    await audit(actor, "branding.config", "settings", "branding");
    return { ok: true };
  });

/* ---------------- Social login ---------------- */
export const getSocialEnabled = createServerFn({ method: "GET" }).handler(async (): Promise<{ google: boolean; facebook: boolean }> => {
  try {
    const { getSocialConfig } = await import("@/server/site-config");
    const c = await getSocialConfig();
    return { google: c.google.enabled && !!c.google.clientId, facebook: c.facebook.enabled && !!c.facebook.appId };
  } catch {
    return { google: false, facebook: false };
  }
});

export const adminGetSocial = createServerFn({ method: "GET" }).handler(async (): Promise<SocialConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getSocialConfig } = await import("@/server/site-config");
  await requireManager();
  return getSocialConfig();
});

export const adminSaveSocial = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as SocialConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveSocialConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveSocialConfig(data);
    await audit(actor, "social.config", "settings", "social");
    return { ok: true };
  });

/* ---------------- Custom Code (CSS / head / footer) ---------------- */
export const getCustomCodePublic = createServerFn({ method: "GET" }).handler(async (): Promise<CustomCodeConfig> => {
  try {
    const { getCustomCode } = await import("@/server/site-config");
    return await getCustomCode();
  } catch {
    return { css: "", headHtml: "", bodyEnd: "" };
  }
});

export const adminGetCustomCode = createServerFn({ method: "GET" }).handler(async (): Promise<CustomCodeConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getCustomCode } = await import("@/server/site-config");
  await requireManager();
  return getCustomCode();
});

export const adminSaveCustomCode = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as CustomCodeConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveCustomCode } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveCustomCode({ css: String(data.css ?? "").slice(0, 50000), headHtml: String(data.headHtml ?? "").slice(0, 50000), bodyEnd: String(data.bodyEnd ?? "").slice(0, 50000) });
    await audit(actor, "customcode.update", "settings", "customcode");
    return { ok: true };
  });

/* ---------------- Delivery coverage ---------------- */
export const getDeliveryPublic = createServerFn({ method: "GET" }).handler(async (): Promise<DeliveryConfig> => {
  try {
    const { getDeliveryConfig } = await import("@/server/site-config");
    return await getDeliveryConfig();
  } catch {
    const { defaultDeliveryConfig } = await import("@/lib/delivery");
    return defaultDeliveryConfig;
  }
});

export const adminGetDelivery = createServerFn({ method: "GET" }).handler(async (): Promise<DeliveryConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getDeliveryConfig } = await import("@/server/site-config");
  await requireManager();
  return getDeliveryConfig();
});

export const adminSaveDelivery = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as DeliveryConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveDeliveryConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveDeliveryConfig(data);
    await audit(actor, "delivery.config", "settings", "delivery");
    return { ok: true };
  });

/* ---------------- Public SEO (for root head + JSON-LD) ---------------- */
export const getSeo = createServerFn({ method: "GET" }).handler(async (): Promise<SeoConfig> => {
  try {
    const { getSeoConfig } = await import("@/server/site-config");
    return await getSeoConfig();
  } catch {
    const { getSeoConfig } = await import("@/server/site-config");
    return getSeoConfig();
  }
});

/* ---------------- Payments config ---------------- */
export const adminGetPayments = createServerFn({ method: "GET" }).handler(async (): Promise<PaymentConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getPaymentConfig } = await import("@/server/site-config");
  await requireManager();
  return getPaymentConfig();
});

export const adminSavePayments = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as PaymentConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { savePaymentConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await savePaymentConfig(data);
    await audit(actor, "payments.config", "settings", "payments", { mode: data.mode });
    return { ok: true };
  });

/* ---------------- SMS config ---------------- */
export const adminGetSms = createServerFn({ method: "GET" }).handler(async (): Promise<SmsConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getSmsConfig } = await import("@/server/site-config");
  await requireManager();
  return getSmsConfig();
});

export const adminSaveSms = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as SmsConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveSmsConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveSmsConfig(data);
    await audit(actor, "sms.config", "settings", "sms", { provider: data.provider });
    return { ok: true };
  });

export const adminTestSms = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ phone: z.string().trim().min(10).max(20) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { sendSms } = await import("@/server/sms/boomcast");
    await requireManager();
    return sendSms(data.phone, "Banglarfish SMS gateway test — your configuration works!");
  });

/* ---------------- SEO config ---------------- */
export const adminGetSeo = createServerFn({ method: "GET" }).handler(async (): Promise<SeoConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getSeoConfig } = await import("@/server/site-config");
  await requireManager();
  return getSeoConfig();
});

export const adminSaveSeo = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as SeoConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveSeoConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveSeoConfig(data);
    await audit(actor, "seo.config", "settings", "seo");
    return { ok: true };
  });
