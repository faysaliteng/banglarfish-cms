// Client-safe config types shared by admin pages and the server config layer.
export type PaymentConfig = {
  mode: "simulate" | "sandbox" | "live";
  cod: { enabled: boolean; instructions: string };
  bkash: { enabled: boolean; appKey: string; appSecret: string; username: string; password: string };
  nagad: { enabled: boolean; merchantId: string; merchantPrivateKey: string; pgPublicKey: string };
  sslcommerz: { enabled: boolean; storeId: string; storePasswd: string };
};

export type SmsConfig = {
  provider: "boomcast" | "custom";
  devMode: boolean;
  apiUrl: string;
  method: "GET" | "POST";
  apiKey: string;
  secretKey: string;
  senderId: string;
  paramApikey: string;
  paramSecret: string;
  paramSender: string;
  paramTo: string;
  paramMsg: string;
  contentType: string;
};

export type BrandingConfig = {
  storeName: string;
  logoLight: string;
  logoDark: string;
  favicon: string;
  announcement: string;
};

export type SocialConfig = {
  google: { enabled: boolean; clientId: string; clientSecret: string };
  facebook: { enabled: boolean; appId: string; appSecret: string };
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
};
