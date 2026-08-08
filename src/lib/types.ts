// Shared client-facing types (no server/pg imports — safe in any bundle).

export type Variant = { id: string; label: string; price: number; stock: number; sku?: string; attributes?: ProductAttribute[] };

export type ProductAttribute = { name: string; value: string };

export type ProductOptionChoice = { label: string; priceDelta: number };
export type ProductOptionGroup = { name: string; nameBn: string; required: boolean; choices: ProductOptionChoice[] };
export type SelectedOption = { group: string; choice: string; priceDelta: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  bn: string;
  category: string;
  price: number; // base price, BDT
  compareAt?: number;
  unit: string; // "kg", "piece", etc.
  weightOptions: string[];
  optionGroups: ProductOptionGroup[];
  image: string;
  images: string[];
  stock: number;
  rating: number;
  reviews: number;
  isNew?: boolean;
  isBest?: boolean;
  description: string;
  variants: Variant[];
  tags: string[];
  attributes: ProductAttribute[];
  sku?: string;
  brand?: string;
  taxClass?: string;
  shippingClass?: string;
  lowStockThreshold?: number;
  isDigital?: boolean;
  downloadUrl?: string;
  noindex?: boolean;
  focusKeyword?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
};

export type Category = { slug: string; name: string; bn: string; image: string };

export type Review = {
  id: string;
  productId: string;
  productName: string;
  customer: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
};

export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published";
  updatedAt: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  template?: string;
  faq?: { q: string; a: string }[];
  showInHeader?: boolean;
  showInFooter?: boolean;
  sort?: number;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  author: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  noindex?: boolean;
  focusKeyword?: string;
};

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  placement: string;
  sort: number;
  active: boolean;
};

export type MenuItem = { label: string; href: string };

export type HomeStat = { n: string; label: string };
export type HomeFeature = { icon: "truck" | "snowflake" | "shield" | "clock"; title: string; desc: string };
export type HomePromo = { title: string; subtitle: string; href: string; theme: "primary" | "brand" };
export type HomeTestimonial = { n: string; loc: string; t: string };

export type Homepage = {
  heroEyebrow: string;
  heroTitleTop: string;
  heroTitleBottom: string;
  heroSubtitle: string;
  heroCtaPrimary: { label: string; href: string };
  heroCtaSecondary: { label: string; href: string };
  heroImage: string;
  stats: HomeStat[];
  features: HomeFeature[];
  categoriesEyebrow: string;
  categoriesTitle: string;
  bestSellersEyebrow: string;
  bestSellersTitle: string;
  promos: HomePromo[];
  newArrivalsEyebrow: string;
  newArrivalsTitle: string;
  testimonialsEyebrow: string;
  testimonialsTitle: string;
  testimonials: HomeTestimonial[];
  newsletterTitle: string;
  newsletterSubtitle: string;
  newsletterCta: string;
  // New content sections
  recipesEyebrow: string;
  recipesTitle: string;
  blogEyebrow: string;
  blogTitle: string;
  masalaEyebrow: string;
  masalaTitle: string;
  masalaCategory: string; // category slug featured in the masala band
  // Per-section on/off switches (admin-controlled)
  sections: HomeSections;
};

export type HomeSections = {
  categories: boolean;
  howItWorks: boolean;
  bestSellers: boolean;
  masala: boolean;
  promos: boolean;
  newArrivals: boolean;
  recipes: boolean;
  blog: boolean;
  testimonials: boolean;
  newsletter: boolean;
  comments?: boolean; // blog comments (with moderation) — optional so existing templates stay valid; defaults on
  contact?: boolean; // /contact page + contact form — optional; defaults on
};

export type Settings = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  currency: string; // ISO code, e.g. USD / EUR / BDT
  currencySymbol: string; // e.g. $, €, ৳
  currencyPosition: "before" | "after";
  currencyDecimals: number; // 0 for BDT/JPY, 2 for USD/EUR
  currencyThousandSep: string; // "," or "." or " "
  address: string;
  freeShippingThreshold: number;
  standardShipping: number;
  taxPercent: number;
  cod: boolean;
  bkash: boolean;
  nagad: boolean;
  sslcommerz: boolean;
  facebook: string;
  instagram: string;
  youtube: string;
  metaTitle: string;
  metaDescription: string;
  announcement: string;
  /** Number for the "chat on WhatsApp" button. Falls back to storePhone. */
  whatsappNumber: string;
  /** Prefilled first line of that chat. */
  whatsappGreeting: string;
  /** Shown under the buy buttons on every product page. Blank hides it. */
  productNote: string;
};

export type ShippingZone = {
  id: string;
  name: string;
  cities: string[];
  rate: number;
  freeAbove: number;
  eta: string;
  active: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minSubtotal: number;
  expiresAt: string | null;
  active: boolean;
  usage: number;
  limit: number;
};

/* ---------- Theme & layout ---------- */
// Surface = the card/panel material (how "3D" and translucent panels feel).
export type ThemeSurface = "flat" | "elevated" | "glass" | "neo" | "clay" | "glossy" | "outline" | "aurora";
// Hero = homepage banner layout.
export type ThemeHero = "split" | "centered" | "fullbleed" | "minimal" | "spotlight" | "diagonal" | "showcase" | "gradient";
// Bg = page background treatment (some are animated).
export type ThemeBg = "solid" | "gradient" | "mesh" | "aurora" | "grid" | "dots" | "waves" | "rays" | "noise";
export type ThemeFont = "inter" | "poppins" | "system" | "manrope" | "playfair" | "montserrat" | "space" | "jakarta";

export type Theme = {
  preset: string;
  primary: string; // hex — main interactive color
  brand: string; // hex — accent (prices, badges)
  accent2: string; // hex — third color used in gradients / glows
  background: string; // hex
  card: string; // hex
  foreground: string; // hex
  radius: number; // px (0–32)
  surface: ThemeSurface;
  hero: ThemeHero;
  bg: ThemeBg;
  font: ThemeFont; // body font
  displayFont: ThemeFont; // heading font
  fontScale: number; // 0.9–1.15 global type scale
  blur: number; // glass blur px (0–40)
  opacity: number; // card translucency % (40–100)
  depth: number; // shadow strength (0–100)
  glow: number; // colored glow intensity (0–100)
  dark: boolean;
  gradientButtons: boolean; // primary→brand gradient buttons
  hover3d: boolean; // subtle card tilt on hover
  animations: boolean; // entrance / hover motion
  pill: boolean; // fully-rounded buttons
  customCss: string; // advanced raw CSS appended after the theme
};
