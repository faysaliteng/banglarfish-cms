// DB-backed configuration for payments, SMS gateway, and SEO — editable from the
// admin panel (WooCommerce/Yoast style). Values are stored in the `settings`
// table (jsonb) and fall back to environment variables when unset.
import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";
import type { PaymentConfig, SmsConfig, SeoConfig, SocialConfig, BrandingConfig, DeliveryConfig, CustomCodeConfig } from "@/lib/config-types";
import { defaultDeliveryConfig } from "@/lib/delivery";

export type { PaymentConfig, SmsConfig, SeoConfig, SocialConfig, BrandingConfig, DeliveryConfig, CustomCodeConfig };

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
    provider: "boomcast",
    devMode: process.env.SMS_DEV_MODE === "true",
    apiUrl: process.env.BOOMCAST_API_URL || "https://api.boomcast.com.bd/boomcast/api/v2/sendtext",
    method: (process.env.BOOMCAST_METHOD as "GET" | "POST") || "GET",
    apiKey: process.env.BOOMCAST_API_KEY || "",
    secretKey: process.env.BOOMCAST_SECRET_KEY || "",
    senderId: process.env.BOOMCAST_SENDER_ID || "Banglarfish",
    paramApikey: process.env.BOOMCAST_PARAM_APIKEY || "apikey",
    paramSecret: process.env.BOOMCAST_PARAM_SECRET || "secretkey",
    paramSender: process.env.BOOMCAST_PARAM_SENDER || "callerID",
    paramTo: process.env.BOOMCAST_PARAM_TO || "toUser",
    paramMsg: process.env.BOOMCAST_PARAM_MSG || "messageContent",
    contentType: process.env.BOOMCAST_CONTENT_TYPE || "application/x-www-form-urlencoded",
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
  };
}

export async function getSeoConfig(): Promise<SeoConfig> {
  const d = seoDefaults();
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, "seo")).limit(1);
    return { ...d, ...((row?.value as Partial<SeoConfig>) ?? {}) };
  } catch {
    return d;
  }
}

export async function saveSeoConfig(cfg: SeoConfig): Promise<void> {
  await db.insert(settings).values({ key: "seo", value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() })
    .onConflictDoUpdate({ target: settings.key, set: { value: cfg as unknown as Record<string, unknown>, updatedAt: new Date() } });
}
