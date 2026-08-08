import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PaymentConfig, SmsConfig, EmailConfig, WhatsAppConfig, OrderNotifyConfig, EmailTemplates, SmsTemplates, SeoConfig, SocialConfig, BrandingConfig, DeliveryConfig, CustomCodeConfig, TaxConfig, CustomerGroupsConfig, ShippingClassesConfig, I18nConfig, PromotionsConfig } from "./config-types";

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
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; info?: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { sendSms } = await import("@/server/sms/boomcast");
    await requireManager();
    return sendSms(data.phone, "Banglarfish SMS gateway test — আপনার কনফিগারেশন কাজ করছে!");
  });

// Admin: send a custom SMS to any number (or to a specific user's phone).
export const adminSendSms = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ phone: z.string().trim().min(6).max(20), message: z.string().trim().min(1).max(1000) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; info?: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { sendSms } = await import("@/server/sms/boomcast");
    const { audit } = await import("@/server/audit");
    const actor = await requireStaff();
    const res = await sendSms(data.phone, data.message);
    await audit(actor, "sms.send", "sms", data.phone, { ok: res.ok, len: data.message.length });
    return res;
  });

/* ---------------- Email config ---------------- */
export const adminGetEmail = createServerFn({ method: "GET" }).handler(async (): Promise<EmailConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getEmailConfig } = await import("@/server/site-config");
  await requireManager();
  return getEmailConfig();
});

export const adminSaveEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as EmailConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveEmailConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveEmailConfig(data);
    await audit(actor, "email.config", "settings", "email", { mode: data.mode, enabled: data.enabled });
    return { ok: true };
  });

export const adminTestEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ to: z.string().trim().email() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { sendEmail } = await import("@/server/email");
    await requireManager();
    try {
      await sendEmail({ to: data.to, subject: "Test email from your store", html: "<p>✅ Your email settings work! This is a test message from your store's admin panel.</p>" });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
    }
  });

/* ---------------- WhatsApp (Meta Cloud API) ---------------- */
export const adminGetWhatsApp = createServerFn({ method: "GET" }).handler(async (): Promise<WhatsAppConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getWhatsAppConfig } = await import("@/server/site-config");
  await requireManager();
  return getWhatsAppConfig();
});

export const adminSaveWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as WhatsAppConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveWhatsAppConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveWhatsAppConfig(data);
    await audit(actor, "whatsapp.config", "settings", "whatsapp", { enabled: data.enabled, mode: data.mode });
    return { ok: true };
  });

export const adminTestWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ to: z.string().trim().min(6).max(20), template: z.string().trim().max(100).optional() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; info?: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    await requireManager();
    if (data.template && data.template.trim()) {
      const { sendWhatsAppTemplate } = await import("@/server/whatsapp");
      return sendWhatsAppTemplate(data.to, data.template.trim(), ["TEST-001", "100"]);
    }
    const { sendWhatsAppText } = await import("@/server/whatsapp");
    return sendWhatsAppText(data.to, "Banglarfish WhatsApp test — your configuration works!");
  });

/* ---------------- Per-status notification toggles ---------------- */
export const adminGetOrderNotify = createServerFn({ method: "GET" }).handler(async (): Promise<OrderNotifyConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getOrderNotifyConfig } = await import("@/server/site-config");
  await requireManager();
  return getOrderNotifyConfig();
});

export const adminSaveOrderNotify = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as OrderNotifyConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveOrderNotifyConfig } = await import("@/server/site-config");
    await requireManager();
    await saveOrderNotifyConfig(data);
    return { ok: true };
  });

/* ---------------- Notification templates (email + SMS) ---------------- */
export const adminGetEmailTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<EmailTemplates> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getEmailTemplates } = await import("@/server/templates");
  await requireManager();
  return getEmailTemplates();
});

export const adminSaveEmailTemplates = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as EmailTemplates)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveEmailTemplates } = await import("@/server/templates");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveEmailTemplates(data);
    await audit(actor, "email.templates", "settings", "emailTemplates");
    return { ok: true };
  });

export const adminGetSmsTemplates = createServerFn({ method: "GET" }).handler(async (): Promise<SmsTemplates> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getSmsTemplates } = await import("@/server/templates");
  await requireManager();
  return getSmsTemplates();
});

export const adminSaveSmsTemplates = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as SmsTemplates)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveSmsTemplates } = await import("@/server/templates");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveSmsTemplates(data);
    await audit(actor, "sms.templates", "settings", "smsTemplates");
    return { ok: true };
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

/* ---------------- Tax engine ---------------- */
export const getTaxPublic = createServerFn({ method: "GET" }).handler(async (): Promise<TaxConfig> => {
  const { getTaxConfig } = await import("@/server/site-config");
  return getTaxConfig();
});

export const adminGetTax = createServerFn({ method: "GET" }).handler(async (): Promise<TaxConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getTaxConfig } = await import("@/server/site-config");
  await requireManager();
  return getTaxConfig();
});

export const adminSaveTax = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as TaxConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveTaxConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveTaxConfig(data);
    await audit(actor, "tax.config", "settings", "tax");
    return { ok: true };
  });

/* ---------------- Internationalization (i18n) ---------------- */
export const getI18nPublic = createServerFn({ method: "GET" }).handler(async (): Promise<I18nConfig> => {
  const { getI18nConfig } = await import("@/server/site-config");
  return getI18nConfig();
});

export type I18nState = { enabled: boolean; lang: string; dir: "ltr" | "rtl"; languages: I18nConfig["languages"] };

// Server-resolved active language (reads the bf_lang cookie + ?lang override server-side).
export const getI18nState = createServerFn({ method: "GET" }).handler(async (): Promise<I18nState> => {
  const { getI18nConfig } = await import("@/server/site-config");
  const cfg = await getI18nConfig();
  let lang = cfg.defaultLang;
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (req) {
      const cookie = req.headers.get("cookie") || "";
      const m = cookie.match(/(?:^|;\s*)bf_lang=([^;]+)/);
      if (m) lang = decodeURIComponent(m[1]);
      const qp = new URL(req.url).searchParams.get("lang");
      if (qp) lang = qp;
    }
  } catch {
    /* no request context */
  }
  const langObj = cfg.languages.find((l) => l.code === lang) ?? cfg.languages.find((l) => l.code === cfg.defaultLang);
  return { enabled: cfg.enabled, lang: langObj?.code ?? cfg.defaultLang, dir: langObj?.rtl ? "rtl" : "ltr", languages: cfg.languages };
});

export const adminGetI18n = createServerFn({ method: "GET" }).handler(async (): Promise<I18nConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getI18nConfig } = await import("@/server/site-config");
  await requireManager();
  return getI18nConfig();
});

export const adminSaveI18n = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as I18nConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveI18nConfig } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveI18nConfig(data);
    await audit(actor, "i18n.config", "settings", "i18n");
    return { ok: true };
  });

/* ---------------- Promotions (automatic) ---------------- */
export const adminGetPromotions = createServerFn({ method: "GET" }).handler(async (): Promise<PromotionsConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getPromotions } = await import("@/server/site-config");
  await requireManager();
  return getPromotions();
});

export const adminSavePromotions = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as PromotionsConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { savePromotions } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await savePromotions(data);
    await audit(actor, "promotions.config", "settings", "promotions");
    return { ok: true };
  });

/* ---------------- Shipping classes ---------------- */
export const getShippingClassesPublic = createServerFn({ method: "GET" }).handler(async (): Promise<ShippingClassesConfig> => {
  const { getShippingClasses } = await import("@/server/site-config");
  return getShippingClasses();
});

export const adminSaveShippingClasses = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as ShippingClassesConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveShippingClasses } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveShippingClasses(data);
    await audit(actor, "shippingClasses.config", "settings", "shippingClasses");
    return { ok: true };
  });

/* ---------------- Customer groups (B2B tiered pricing) ---------------- */
export const getCustomerGroupsPublic = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerGroupsConfig> => {
  const { getCustomerGroups } = await import("@/server/site-config");
  return getCustomerGroups();
});

export const adminGetCustomerGroups = createServerFn({ method: "GET" }).handler(async (): Promise<CustomerGroupsConfig> => {
  const { requireManager } = await import("@/server/auth/context");
  const { getCustomerGroups } = await import("@/server/site-config");
  await requireManager();
  return getCustomerGroups();
});

export const adminSaveCustomerGroups = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => i as CustomerGroupsConfig)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { saveCustomerGroups } = await import("@/server/site-config");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    await saveCustomerGroups(data);
    await audit(actor, "customerGroups.config", "settings", "customerGroups");
    return { ok: true };
  });

/* ---------------- Payment methods available to shoppers ---------------- */
// Public: which payment methods checkout should offer. Nagad has no real
// gateway implementation yet, so it is only offered in simulate mode — a live
// store must never send a buyer to the mock payment page.
export const getEnabledPaymentMethods = createServerFn({ method: "GET" }).handler(async (): Promise<{ cod: boolean; bkash: boolean; nagad: boolean; card: boolean }> => {
  try {
    const { getPaymentConfig } = await import("@/server/site-config");
    const c = await getPaymentConfig();
    const simulate = c.mode === "simulate";
    return {
      cod: !!c.cod.enabled,
      bkash: !!c.bkash.enabled,
      nagad: !!c.nagad.enabled && simulate,
      card: !!c.sslcommerz.enabled,
    };
  } catch {
    return { cod: true, bkash: false, nagad: false, card: false };
  }
});
