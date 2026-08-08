// DB-backed configuration for payments, SMS gateway, and SEO — editable from the
// admin panel (WooCommerce/Yoast style). Values are stored in the `settings`
// table (jsonb) and fall back to environment variables when unset.
import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";
import type { PaymentConfig, SmsConfig, EmailConfig, WhatsAppConfig, OrderNotifyConfig, SeoConfig, SocialConfig, BrandingConfig, DeliveryConfig, CustomCodeConfig, TaxConfig, CustomerGroupsConfig, ShippingClassesConfig, I18nConfig, AiConfig } from "@/lib/config-types";
import { defaultDeliveryConfig } from "@/lib/delivery";

export type { PaymentConfig, SmsConfig, EmailConfig, WhatsAppConfig, SeoConfig, SocialConfig, BrandingConfig, DeliveryConfig, CustomCodeConfig, TaxConfig, CustomerGroupsConfig, ShippingClassesConfig, I18nConfig, AiConfig };

/* ---------------- AI assistant ---------------- */
function aiDefaults(): AiConfig {
  return {
    enabled: false,
    provider: (process.env.AI_PROVIDER as AiConfig["provider"]) || "anthropic",
    apiKey: process.env.AI_API_KEY || process.env.ANTHROPIC_API_KEY || "",
    model: process.env.AI_MODEL || "claude-sonnet-5",
    baseUrl: process.env.AI_BASE_URL || "",
    tone: "friendly, trustworthy, concise; Bangladeshi fish e-commerce brand",
    imageProvider: (process.env.AI_IMAGE_PROVIDER as AiConfig["imageProvider"]) || "none",
    imageApiKey: process.env.AI_IMAGE_API_KEY || process.env.GEMINI_API_KEY || "",
    imageModel: process.env.AI_IMAGE_MODEL || "gemini-2.5-flash-image",
    maxTokens: 1024,
  };
}

export async function getAiConfig(): Promise<AiConfig> {
  const d = aiDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "ai")).limit(1);
    return { ...d, ...((row?.value as Partial<AiConfig>) ?? {}) };
  } catch {
    return d;
  }
}

export async function saveAiConfig(cfg: AiConfig): Promise<void> {
  await db.insert(settings).values({ key: "ai", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Internationalization (i18n) ---------------- */
function i18nDefaults(): I18nConfig {
  return {
    enabled: false,
    defaultLang: "en",
    languages: [{ code: "en", name: "English", rtl: false }],
    strings: {},
  };
}

export async function getI18nConfig(): Promise<I18nConfig> {
  const d = i18nDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "i18n")).limit(1);
    const saved = (row?.value as Partial<I18nConfig>) ?? {};
    return {
      enabled: saved.enabled ?? d.enabled,
      defaultLang: saved.defaultLang ?? d.defaultLang,
      languages: saved.languages?.length ? saved.languages : d.languages,
      strings: saved.strings ?? {},
    };
  } catch {
    return d;
  }
}

export async function saveI18nConfig(cfg: I18nConfig): Promise<void> {
  await db.insert(settings).values({ key: "i18n", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Promotions (automatic) ---------------- */
export async function getPromotions(): Promise<import("@/lib/config-types").PromotionsConfig> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "promotions")).limit(1);
    const saved = (row?.value as { promos?: import("@/lib/config-types").Promotion[] }) ?? {};
    return { promos: saved.promos ?? [] };
  } catch {
    return { promos: [] };
  }
}
export async function savePromotions(cfg: import("@/lib/config-types").PromotionsConfig): Promise<void> {
  await db.insert(settings).values({ key: "promotions", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Shipping classes ---------------- */
export async function getShippingClasses(): Promise<ShippingClassesConfig> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "shippingClasses")).limit(1);
    const saved = (row?.value as Partial<ShippingClassesConfig>) ?? {};
    return { classes: saved.classes ?? [] };
  } catch {
    return { classes: [] };
  }
}

export async function saveShippingClasses(cfg: ShippingClassesConfig): Promise<void> {
  await db.insert(settings).values({ key: "shippingClasses", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Customer groups (B2B) ---------------- */
function customerGroupsDefaults(): CustomerGroupsConfig {
  return {
    groups: [
      { id: "retail", name: "Retail (default)", discountPercent: 0, taxExempt: false },
      { id: "wholesale", name: "Wholesale", discountPercent: 15, taxExempt: false },
      { id: "vip", name: "VIP", discountPercent: 10, taxExempt: false },
    ],
  };
}

export async function getCustomerGroups(): Promise<CustomerGroupsConfig> {
  const d = customerGroupsDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "customerGroups")).limit(1);
    const saved = (row?.value as Partial<CustomerGroupsConfig>) ?? {};
    return { groups: saved.groups ?? d.groups };
  } catch {
    return d;
  }
}

export async function saveCustomerGroups(cfg: CustomerGroupsConfig): Promise<void> {
  await db.insert(settings).values({ key: "customerGroups", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Tax engine ---------------- */
function taxDefaults(): TaxConfig {
  return {
    enabled: false,
    pricesIncludeTax: false,
    classes: [
      { id: "standard", name: "Standard" },
      { id: "reduced", name: "Reduced rate" },
      { id: "zero", name: "Zero rate" },
    ],
    rates: [],
  };
}

export async function getTaxConfig(): Promise<TaxConfig> {
  const d = taxDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "tax")).limit(1);
    const saved = (row?.value as Partial<TaxConfig>) ?? {};
    return { ...d, ...saved, classes: saved.classes ?? d.classes, rates: saved.rates ?? d.rates };
  } catch {
    return d;
  }
}

export async function saveTaxConfig(cfg: TaxConfig): Promise<void> {
  await db.insert(settings).values({ key: "tax", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

const defaultCustomCode: CustomCodeConfig = { css: "", headHtml: "", bodyEnd: "" };

export async function getCustomCode(): Promise<CustomCodeConfig> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "customcode")).limit(1);
    return { ...defaultCustomCode, ...((row?.value as Partial<CustomCodeConfig>) ?? {}) };
  } catch {
    return defaultCustomCode;
  }
}

export async function saveCustomCode(cfg: CustomCodeConfig): Promise<void> {
  await db.insert(settings).values({ key: "customcode", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

export type MaintenanceConfig = { enabled: boolean; message: string };
const defaultMaintenance: MaintenanceConfig = { enabled: false, message: "We're doing some quick maintenance and will be back shortly." };

export async function getMaintenance(): Promise<MaintenanceConfig> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "maintenance")).limit(1);
    return { ...defaultMaintenance, ...((row?.value as Partial<MaintenanceConfig>) ?? {}) };
  } catch {
    return defaultMaintenance;
  }
}

export async function saveMaintenance(cfg: MaintenanceConfig): Promise<void> {
  await db.insert(settings).values({ key: "maintenance", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

export async function getDeliveryConfig(): Promise<DeliveryConfig> {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "delivery")).limit(1);
    return { ...defaultDeliveryConfig, ...((row?.value as Partial<DeliveryConfig>) ?? {}) };
  } catch {
    return defaultDeliveryConfig;
  }
}

export async function saveDeliveryConfig(cfg: DeliveryConfig): Promise<void> {
  await db.insert(settings).values({ key: "delivery", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Branding ---------------- */
function brandingDefaults(): BrandingConfig {
  return {
    storeName: "Banglarfish",
    logoLight: "/img/logo-light.png",
    logoDark: "/img/logo-dark.png",
    favicon: "/img/favicon.png",
    announcement: "Free delivery on orders over ৳2,000 · Same-day delivery in Dhaka",
  };
}

export async function getBrandingConfig(): Promise<BrandingConfig> {
  const d = brandingDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "branding")).limit(1);
    return { ...d, ...((row?.value as Partial<BrandingConfig>) ?? {}) };
  } catch {
    return d;
  }
}

export async function saveBrandingConfig(cfg: BrandingConfig): Promise<void> {
  await db.insert(settings).values({ key: "branding", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Social login (OAuth) ---------------- */
function socialDefaults(): SocialConfig {
  return {
    google: { enabled: !!process.env.GOOGLE_CLIENT_ID, clientId: process.env.GOOGLE_CLIENT_ID || "", clientSecret: process.env.GOOGLE_CLIENT_SECRET || "" },
    facebook: { enabled: !!process.env.FACEBOOK_APP_ID, appId: process.env.FACEBOOK_APP_ID || "", appSecret: process.env.FACEBOOK_APP_SECRET || "" },
  };
}

export async function getSocialConfig(): Promise<SocialConfig> {
  const d = socialDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "social")).limit(1);
    const s = (row?.value as Partial<SocialConfig>) ?? {};
    return { google: { ...d.google, ...s.google }, facebook: { ...d.facebook, ...s.facebook } };
  } catch {
    return d;
  }
}

export async function saveSocialConfig(cfg: SocialConfig): Promise<void> {
  await db.insert(settings).values({ key: "social", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Payments ---------------- */
function paymentDefaults(): PaymentConfig {
  const mode = (process.env.PAYMENT_MODE as PaymentConfig["mode"]) || "simulate";
  return {
    mode: ["simulate", "sandbox", "live"].includes(mode) ? mode : "simulate",
    cod: { enabled: true, instructions: "Pay in cash when your order is delivered." },
    bkash: { enabled: true, appKey: process.env.BKASH_APP_KEY || "", appSecret: process.env.BKASH_APP_SECRET || "", username: process.env.BKASH_USERNAME || "", password: process.env.BKASH_PASSWORD || "" },
    nagad: { enabled: true, merchantId: process.env.NAGAD_MERCHANT_ID || "", merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY || "", pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY || "" },
    sslcommerz: { enabled: false, storeId: process.env.SSLCZ_STORE_ID || "", storePasswd: process.env.SSLCZ_STORE_PASSWD || "" },
  };
}

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const d = paymentDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "payments")).limit(1);
    const s = (row?.value as Partial<PaymentConfig>) ?? {};
    return {
      mode: s.mode ?? d.mode,
      cod: { ...d.cod, ...s.cod },
      bkash: { ...d.bkash, ...s.bkash },
      nagad: { ...d.nagad, ...s.nagad },
      sslcommerz: { ...d.sslcommerz, ...s.sslcommerz },
    };
  } catch {
    return d;
  }
}

export async function savePaymentConfig(cfg: PaymentConfig): Promise<void> {
  await db.insert(settings).values({ key: "payments", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- SMS gateway ---------------- */
function smsDefaults(): SmsConfig {
  return {
    provider: (process.env.SMS_PROVIDER as SmsConfig["provider"]) || "boomcast-web",
    devMode: process.env.SMS_DEV_MODE === "true",
    apiUrl: process.env.BOOMCAST_API_URL || "http://api.boom-cast.com/boomcast/WebFramework/boomCastWebService/externalApiSendTextMessage.php",
    method: (process.env.BOOMCAST_METHOD as "GET" | "POST") || "GET",
    apiKey: process.env.BOOMCAST_API_KEY || "",
    secretKey: process.env.BOOMCAST_SECRET_KEY || "",
    senderId: process.env.BOOMCAST_SENDER_ID || "Banglarfish",
    userName: process.env.BOOMCAST_USERNAME || "",
    password: process.env.BOOMCAST_PASSWORD || "",
    masking: process.env.BOOMCAST_MASKING || "NOMASK",
    paramApikey: process.env.BOOMCAST_PARAM_APIKEY || "apikey",
    paramSecret: process.env.BOOMCAST_PARAM_SECRET || "secretkey",
    paramSender: process.env.BOOMCAST_PARAM_SENDER || "callerID",
    paramTo: process.env.BOOMCAST_PARAM_TO || "toUser",
    paramMsg: process.env.BOOMCAST_PARAM_MSG || "messageContent",
    contentType: process.env.BOOMCAST_CONTENT_TYPE || "application/x-www-form-urlencoded",
    alertPhone: process.env.SMS_ALERT_PHONE || "",
  };
}

export async function getSmsConfig(): Promise<SmsConfig> {
  const d = smsDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "sms")).limit(1);
    return { ...d, ...((row?.value as Partial<SmsConfig>) ?? {}) };
  } catch {
    return d;
  }
}

export async function saveSmsConfig(cfg: SmsConfig): Promise<void> {
  await db.insert(settings).values({ key: "sms", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Email (SMTP / Resend) ---------------- */
function emailDefaults(): EmailConfig {
  return {
    enabled: process.env.EMAIL_ENABLED === "true",
    mode: (process.env.EMAIL_MODE as "smtp" | "resend") || "smtp",
    fromName: process.env.EMAIL_FROM_NAME || "Banglarfish",
    fromEmail: process.env.EMAIL_FROM || "",
    replyTo: process.env.EMAIL_REPLY_TO || "",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: process.env.SMTP_SECURE === "true",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    resendApiKey: process.env.RESEND_API_KEY || "",
    notifyWelcome: true,
    notifyOrderConfirm: true,
    notifyOrderStatus: true,
  };
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const d = emailDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "email")).limit(1);
    return { ...d, ...((row?.value as Partial<EmailConfig>) ?? {}) };
  } catch {
    return d;
  }
}

export async function saveEmailConfig(cfg: EmailConfig): Promise<void> {
  await db.insert(settings).values({ key: "email", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- WhatsApp (Meta Cloud API) ---------------- */
function whatsappDefaults(): WhatsAppConfig {
  return {
    enabled: false,
    phoneNumberId: process.env.WA_PHONE_NUMBER_ID || "",
    accessToken: process.env.WA_ACCESS_TOKEN || "",
    apiVersion: process.env.WA_API_VERSION || "v21.0",
    mode: "template",
    langCode: "en",
    orderTemplate: "",
    statusTemplate: "",
    notifyOrderConfirm: true,
    notifyOrderStatus: true,
  };
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const d = whatsappDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "whatsapp")).limit(1);
    return { ...d, ...((row?.value as Partial<WhatsAppConfig>) ?? {}) };
  } catch {
    return d;
  }
}

export async function saveWhatsAppConfig(cfg: WhatsAppConfig): Promise<void> {
  await db.insert(settings).values({ key: "whatsapp", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- Per-status notification toggles ---------------- */
function orderNotifyDefaults(): OrderNotifyConfig {
  return { confirmed: true, processing: true, packed: true, shipped: true, delivered: true, cancelled: true, refunded: true };
}
export async function getOrderNotifyConfig(): Promise<OrderNotifyConfig> {
  const d = orderNotifyDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "orderNotify")).limit(1);
    return { ...d, ...((row?.value as Partial<OrderNotifyConfig>) ?? {}) };
  } catch {
    return d;
  }
}
export async function saveOrderNotifyConfig(cfg: OrderNotifyConfig): Promise<void> {
  await db.insert(settings).values({ key: "orderNotify", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

/* ---------------- SEO ---------------- */
function seoDefaults(): SeoConfig {
  return {
    titleTemplate: "%page% — %site%",
    siteName: "Banglarfish",
    defaultTitle: "Banglarfish — Fresh Fish Delivered from River to Kitchen",
    defaultDescription: "Order fresh hilsa, rohu, prawn, and dried fish online in Bangladesh. Same-day delivery in Dhaka.",
    defaultOgImage: "/img/hero-fish.jpg",
    twitterHandle: "",
    facebookAppId: "",
    organizationName: "Banglarfish",
    organizationLogo: "/img/logo-light.png",
    googleVerification: "",
    bingVerification: "",
    socialProfiles: ["https://facebook.com/banglarfish", "https://instagram.com/banglarfish"],
    noindexSite: false,
    robotsTxt: "",
    breadcrumbs: true,
    trailingSlash: false,
    indexNow: false,
    indexNowKey: "",
    productTitleTemplate: "%page% — %site%",
    postTitleTemplate: "%page% — %site%",
    categoryTitleTemplate: "%page% — %site%",
    localBusiness: {
      enabled: true, type: "Store", name: "Banglarfish", phone: "+880 9642-057407",
      street: "House-349, Road-15, Block-K, South Banasree", city: "Dhaka", region: "Dhaka",
      postalCode: "1219", country: "BD", lat: "", lng: "", priceRange: "৳৳", hours: "Mo-Su 09:00-21:00",
    },
  };
}

export async function getSeoConfig(): Promise<SeoConfig> {
  const d = seoDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "seo")).limit(1);
    const saved = (row?.value as Partial<SeoConfig>) ?? {};
    return { ...d, ...saved, localBusiness: { ...d.localBusiness, ...(saved.localBusiness ?? {}) } };
  } catch {
    return d;
  }
}

export async function saveSeoConfig(cfg: SeoConfig): Promise<void> {
  await db.insert(settings).values({ key: "seo", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}

// Returns the IndexNow key, generating + persisting one on first use.
export async function getOrCreateIndexNowKey(): Promise<string> {
  const seo = await getSeoConfig();
  if (seo.indexNowKey) return seo.indexNowKey;
  const { randomBytes } = await import("node:crypto");
  const key = randomBytes(16).toString("hex");
  await saveSeoConfig({ ...seo, indexNowKey: key });
  return key;
}
