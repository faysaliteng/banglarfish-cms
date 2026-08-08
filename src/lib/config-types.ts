// Client-safe config types shared by admin pages and the server config layer.

// One row of the in-panel email client (Sent / Inbox / Drafts).
export type EmailAttachment = { filename: string; url: string; size?: number };
export type EmailMessage = {
  id: string;
  folder: "inbox" | "sent" | "drafts";
  direction: "outbound" | "inbound";
  fromAddr: string;
  toAddr: string;
  cc: string;
  bcc: string;
  subject: string;
  html: string;
  textBody: string;
  attachments: EmailAttachment[];
  messageId: string;
  inReplyTo: string;
  status: "sent" | "failed" | "received" | "draft";
  errorText: string;
  isRead: boolean;
  category: string;
  createdAt: string;
};

// A drag-and-drop landing page (built with the visual editor).
export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  html: string;
  css: string;
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  noindex: boolean;
  published: boolean;
  updatedAt: string;
};

export type PaymentConfig = {
  mode: "simulate" | "sandbox" | "live";
  cod: { enabled: boolean; instructions: string };
  bkash: { enabled: boolean; appKey: string; appSecret: string; username: string; password: string };
  nagad: { enabled: boolean; merchantId: string; merchantPrivateKey: string; pgPublicKey: string };
  sslcommerz: { enabled: boolean; storeId: string; storePasswd: string };
};

export type SmsConfig = {
  provider: "boomcast" | "boomcast-web" | "custom";
  devMode: boolean;
  apiUrl: string;
  method: "GET" | "POST";
  apiKey: string;
  secretKey: string;
  senderId: string;
  // boomcast-web (api.boom-cast.com externalApiSendTextMessage.php)
  userName: string;
  password: string;
  masking: string;
  paramApikey: string;
  paramSecret: string;
  paramSender: string;
  paramTo: string;
  paramMsg: string;
  contentType: string;
  alertPhone: string; // admin phone for low-stock alerts (optional)
};

export type EmailConfig = {
  enabled: boolean;
  mode: "smtp" | "resend"; // SMTP (any provider) or Resend HTTP API
  fromName: string;
  fromEmail: string;
  replyTo: string;
  // SMTP (Brevo/Gmail/Mailgun/etc.)
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean; // true = 465/SSL, false = 587/STARTTLS
  smtpUser: string;
  smtpPass: string;
  // Resend HTTP API
  resendApiKey: string;
  // Which notification emails to send
  notifyWelcome: boolean;
  notifyOrderConfirm: boolean;
  notifyOrderStatus: boolean;
};

export type WhatsAppConfig = {
  enabled: boolean;
  phoneNumberId: string;   // Meta WhatsApp Cloud API phone number ID
  accessToken: string;     // permanent access token
  apiVersion: string;      // e.g. v21.0
  mode: "template" | "text"; // template = business-initiated (needs approved templates)
  langCode: string;        // template language, e.g. en / en_US
  orderTemplate: string;   // template name for order confirmation (params: order#, total)
  statusTemplate: string;  // template name for status update (params: order#, status)
  notifyOrderConfirm: boolean;
  notifyOrderStatus: boolean;
};

export type OrderNotifyConfig = { confirmed: boolean; processing: boolean; packed: boolean; shipped: boolean; delivered: boolean; cancelled: boolean; refunded: boolean };

export type EmailTpl = { subject: string; body: string };
export type EmailTemplates = { welcome: EmailTpl; passwordReset: EmailTpl; orderConfirm: EmailTpl; orderStatus: EmailTpl };
export type SmsTemplates = { otp: string; orderConfirm: string; orderStatus: string };

export type BrandingConfig = {
  storeName: string;
  logoLight: string;
  logoDark: string;
  favicon: string;
  announcement: string;
};

export type SocialConfig = {
  google: { enabled: boolean; clientId: string; clientSecret: string };
  facebook: { enabled: boolean; appId: string; appSecret: string; configId?: string };
};

export type CustomCodeConfig = {
  css: string; // global custom CSS (site-wide, SSR-injected)
  headHtml: string; // injected into <head> on the client (meta, analytics, fonts)
  bodyEnd: string; // injected before </body> on the client (chat widgets, pixels, JS)
};

export type DeliveryArea = { id: string; name: string; terms: string[] };
export type DeliveryConfig = {
  enabled: boolean; // when false, delivery is allowed everywhere (no restriction)
  message: string; // shown when the entered address is outside coverage
  areas: DeliveryArea[];
};

/* ---------------- Internationalization (i18n) ---------------- */
export type Language = { code: string; name: string; rtl: boolean };
export type I18nConfig = {
  enabled: boolean;
  defaultLang: string;
  languages: Language[];
  // Per-language UI string overrides: strings[langCode][key] = translation.
  strings: Record<string, Record<string, string>>;
};

/* ---------------- Promotions (automatic, no coupon code) ---------------- */
export type Promotion = {
  id: string;
  name: string;
  active: boolean;
  minSubtotal: number; // condition: cart subtotal >= this (0 = always)
  action: "percent" | "fixed" | "free_shipping";
  value: number; // percent (0-100) or fixed amount; ignored for free_shipping
};
export type PromotionsConfig = { promos: Promotion[] };

/* ---------------- Shipping classes (per-product handling surcharge) ---------------- */
export type ShippingClass = { id: string; name: string; fee: number }; // fee added per matching cart line
export type ShippingClassesConfig = { classes: ShippingClass[] };

/* ---------------- AI assistant (pluggable providers, Claude first-class) ---------------- */
export type AiConfig = {
  enabled: boolean;
  provider: "anthropic" | "openai" | "ollama";
  apiKey: string;
  model: string;
  baseUrl: string; // for openai-compatible / ollama endpoints
  tone: string; // brand tone-of-voice used in prompts
  maxTokens: number;
};

/* ---------------- Customer groups (B2B tiered pricing) ---------------- */
export type CustomerGroup = {
  id: string; // stable slug, e.g. "wholesale"
  name: string;
  discountPercent: number; // % off the subtotal for members of this group
  taxExempt: boolean; // members pay no tax (common for B2B/wholesale)
};
export type CustomerGroupsConfig = { groups: CustomerGroup[] };

/* ---------------- Tax engine (WooCommerce-style) ---------------- */
export type TaxClass = { id: string; name: string }; // id is a stable slug, e.g. "standard"
export type TaxRate = {
  id: string;
  name: string; // label shown on invoices, e.g. "VAT", "GST", "Sales Tax"
  classId: string; // which tax class this rate belongs to
  region: string; // "*" = everywhere, or a country/state/city/district string matched against the buyer address
  rate: number; // percentage, e.g. 15 or 7.5
  priority: number; // application order; compound rates stack on the running total
  compound: boolean; // if true, calculated on (line + previously applied taxes)
};
export type TaxConfig = {
  enabled: boolean;
  pricesIncludeTax: boolean; // catalog prices already include tax (extract instead of add)
  classes: TaxClass[];
  rates: TaxRate[];
};

export type SeoConfig = {
  titleTemplate: string;
  siteName: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultOgImage: string;
  twitterHandle: string;
  facebookAppId: string;
  organizationName: string;
  organizationLogo: string;
  googleVerification: string;
  bingVerification: string;
  socialProfiles: string[];
  noindexSite: boolean;
  // Advanced (Yoast-Pro style)
  robotsTxt: string; // custom robots.txt content; empty = auto-generated default
  breadcrumbs: boolean; // emit BreadcrumbList schema on product/category/content pages
  trailingSlash: boolean; // permalink policy: enforce a trailing slash on URLs
  // IndexNow (instant search-engine notification on publish/update)
  indexNow: boolean;
  indexNowKey: string; // auto-generated; served at /{key}.txt
  // Per-type meta title templates (%page% / %site% variables)
  productTitleTemplate: string;
  postTitleTemplate: string;
  categoryTitleTemplate: string;
  // Local SEO — emits LocalBusiness JSON-LD when enabled
  localBusiness: {
    enabled: boolean;
    type: string; // e.g. "Store", "Restaurant", "LocalBusiness"
    name: string;
    phone: string;
    street: string;
    city: string;
    region: string;
    postalCode: string;
    country: string; // ISO-2, e.g. BD
    lat: string;
    lng: string;
    priceRange: string; // e.g. "৳৳"
    hours: string; // e.g. "Mo-Su 09:00-21:00"
  };
};
