// PostgreSQL schema (Drizzle ORM) for the self-hosted Banglarfish platform.
// All money is stored as integer BDT (whole taka) to match the storefront's
// whole-taka pricing and keep client arithmetic in plain numbers.
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  bigserial,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------- Enums ---------- */
// "support" = a restricted role that can ONLY use the email client (no other
// admin access). Kept outside the staff→admin privilege ladder.
export const roleEnum = pgEnum("role", ["customer", "support", "staff", "manager", "admin"]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "failed", "refunded"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cod", "bkash", "nagad", "card"]);
export const contentStatusEnum = pgEnum("content_status", ["draft", "published"]);
export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);
export const couponTypeEnum = pgEnum("coupon_type", ["percent", "fixed"]);
export const otpPurposeEnum = pgEnum("otp_purpose", ["signup", "login", "reset", "verify"]);

/* ---------- Auth ---------- */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull().default(""),
    role: roleEnum("role").notNull().default("customer"),
    customerGroup: text("customer_group").notNull().default(""), // B2B tiered-pricing group id
    phoneVerified: boolean("phone_verified").notNull().default(false),
    emailVerified: boolean("email_verified").notNull().default(false),
    status: text("status").notNull().default("active"), // active | blocked
    totpSecret: text("totp_secret"), // base32 TOTP secret (null = 2FA not set up)
    totpEnabled: boolean("totp_enabled").notNull().default(false),
    totpRecovery: jsonb("totp_recovery").$type<string[]>(), // hashed one-time recovery codes
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // opaque random token (hashed at rest)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    purpose: otpPurposeEnum("purpose").notNull().default("signup"),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    attempts: integer("attempts").notNull().default(0),
    consumed: boolean("consumed").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("otp_phone_idx").on(t.phone)],
);

// One-time email links (password reset, email verification).
export const emailTokens = pgTable(
  "email_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    tokenHash: text("token_hash").notNull(), // sha256 of the token in the link
    purpose: text("purpose").notNull().default("reset"), // reset | verify
    consumed: boolean("consumed").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_tokens_hash_idx").on(t.tokenHash)],
);

// Captured checkouts for abandoned-cart recovery.
export const abandonedCarts = pgTable(
  "abandoned_carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    items: jsonb("items").$type<{ name: string; qty: number; price: number }[]>().notNull().default([]),
    subtotal: integer("subtotal").notNull().default(0),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("abandoned_phone_idx").on(t.phone), index("abandoned_email_idx").on(t.email)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    fullName: text("full_name").notNull().default(""),
    phone: text("phone").notNull().default(""),
    addressLine1: text("address_line1").notNull().default(""),
    addressLine2: text("address_line2"),
    city: text("city").notNull().default(""),
    district: text("district"),
    postalCode: text("postal_code"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/* ---------- Catalog ---------- */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    bn: text("bn").notNull().default(""),
    image: text("image").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    bn: text("bn").notNull().default(""),
    categorySlug: text("category_slug").notNull().default(""),
    price: integer("price").notNull().default(0), // base price per unit, BDT
    compareAt: integer("compare_at"),
    unit: text("unit").notNull().default("kg"),
    description: text("description").notNull().default(""),
    image: text("image").notNull().default(""),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    weightOptions: jsonb("weight_options").$type<string[]>().notNull().default([]),
    stock: integer("stock").notNull().default(0),
    rating: real("rating").notNull().default(0),
    reviewsCount: integer("reviews_count").notNull().default(0),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    isNewArrival: boolean("is_new_arrival").notNull().default(false),
    active: boolean("active").notNull().default(true),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImage: text("og_image"),
    sku: text("sku"),
    brand: text("brand"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    attributes: jsonb("attributes").$type<{ name: string; value: string }[]>().notNull().default([]),
    taxClass: text("tax_class").notNull().default("standard"), // links to a TaxConfig class id
    shippingClass: text("shipping_class").notNull().default(""), // links to a ShippingClass id (handling surcharge)
    isDigital: boolean("is_digital").notNull().default(false), // digital product (license key or download)
    downloadUrl: text("download_url").notNull().default(""), // for downloadable digital products
    lowStockThreshold: integer("low_stock_threshold").notNull().default(0), // 0 = use global default
    noindex: boolean("noindex").notNull().default(false), // per-item SEO noindex
    focusKeyword: text("focus_keyword").notNull().default(""), // Yoast-style focus keyphrase
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("products_slug_uq").on(t.slug), index("products_category_idx").on(t.categorySlug)],
);

// Real weight/cut variants with their own price + stock (fixes flat-price bug).
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // e.g. "500g", "1kg", "2kg" or "L / Red"
    price: integer("price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    sku: text("sku"),
    sort: integer("sort").notNull().default(0),
    attributes: jsonb("attributes").$type<{ name: string; value: string }[]>().notNull().default([]), // multi-axis variation matrix
  },
  (t) => [index("variants_product_idx").on(t.productId)],
);

// License-key vault for digital products. Keys are assigned to an order on payment.
export const licenseKeys = pgTable(
  "license_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    orderId: uuid("order_id"),
    orderNumber: text("order_number"),
    assignedAt: timestamp("assigned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("license_keys_product_idx").on(t.productId), index("license_keys_order_idx").on(t.orderId)],
);

export const inventoryLedger = pgTable("inventory_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
  variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull().default("adjustment"), // sale | restock | adjustment | cancel
  note: text("note"),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Orders ---------- */
export type OrderItem = {
  productId: string;
  variantId: string | null;
  name: string;
  image: string;
  weight: string;
  price: number;
  qty: number;
};

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
    subtotal: integer("subtotal").notNull().default(0),
    shipping: integer("shipping").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    total: integer("total").notNull().default(0),
    couponCode: text("coupon_code"),
    giftCardCode: text("gift_card_code"),
    giftCardAmount: integer("gift_card_amount").notNull().default(0),
    trackingNumber: text("tracking_number"),
    courier: text("courier"),
    transactionId: text("transaction_id"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email"),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city").notNull(),
    district: text("district"),
    postalCode: text("postal_code"),
    notes: text("notes"),
    items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("orders_number_uq").on(t.orderNumber), index("orders_user_idx").on(t.userId)],
);

export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- Promotions & shipping ---------- */
export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    type: couponTypeEnum("type").notNull().default("percent"),
    value: integer("value").notNull().default(0),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    active: boolean("active").notNull().default(true),
    usage: integer("usage").notNull().default(0),
    usageLimit: integer("usage_limit").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupons_code_uq").on(t.code)],
);

export const shippingZones = pgTable("shipping_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cities: jsonb("cities").$type<string[]>().notNull().default([]),
  rate: integer("rate").notNull().default(0),
  freeAbove: integer("free_above").notNull().default(0),
  eta: text("eta").notNull().default(""),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
});

/* ---------- Content / CMS ---------- */
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => products.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull().default(""),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  customer: text("customer").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  status: reviewStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    status: contentStatusEnum("status").notNull().default("draft"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImage: text("og_image"),
    noindex: boolean("noindex").notNull().default(false),
    template: text("template").notNull().default("default"),
    faq: jsonb("faq").$type<{ q: string; a: string }[]>(), // FAQ items -> FAQPage JSON-LD
    sort: integer("sort").notNull().default(0),
    showInHeader: boolean("show_in_header").notNull().default(false),
    showInFooter: boolean("show_in_footer").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pages_slug_uq").on(t.slug)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    excerpt: text("excerpt").notNull().default(""),
    body: text("body").notNull().default(""),
    coverImage: text("cover_image").notNull().default(""),
    author: text("author").notNull().default(""),
    category: text("category").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    ogImage: text("og_image"),
    noindex: boolean("noindex").notNull().default(false),
    focusKeyword: text("focus_keyword").notNull().default(""),
    status: contentStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("blog_slug_uq").on(t.slug)],
);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: text("size").notNull().default(""),
  width: integer("width"),
  height: integer("height"),
  hash: text("hash"), // sha256 of the original bytes (dedup)
  alt: text("alt").notNull().default(""), // accessibility / SEO alt text
  lqip: text("lqip").notNull().default(""), // tiny base64 blur placeholder
  // Lossless-looking compression bookkeeping (same pixels, fewer bytes).
  originalBytes: integer("original_bytes").notNull().default(0),
  optimizedBytes: integer("optimized_bytes").notNull().default(0),
  optimizedAt: timestamp("optimized_at", { withTimezone: true }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const banners = pgTable("banners", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default(""),
  subtitle: text("subtitle").notNull().default(""),
  image: text("image").notNull().default(""),
  href: text("href").notNull().default(""),
  placement: text("placement").notNull().default("hero"), // hero | promo | strip
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export type MenuItem = { label: string; href: string };
export const menus = pgTable(
  "menus",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    location: text("location").notNull(), // header | footer
    items: jsonb("items").$type<MenuItem[]>().notNull().default([]),
  },
  (t) => [uniqueIndex("menus_location_uq").on(t.location)],
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("wishlist_uq").on(t.userId, t.productId)],
);

/**
 * Newsletter topics a subscriber can opt into independently. Unsubscribing from
 * "new recipes" should not also stop the weekly stock list.
 */
export type NewsletterTopics = {
  products: boolean;   // new items in the shop
  blog: boolean;       // new blog posts
  recipes: boolean;    // new recipes
  offers: boolean;     // price drops, coupons, promotions
  digest: boolean;     // the weekly what's-available email
};

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    couponCode: text("coupon_code").notNull().default(""),
    /**
     * "unsubscribed" rows are KEPT, not deleted. A deleted row would silently
     * re-subscribe anyone who later typed their address into the footer form,
     * which is exactly the behaviour that gets a sending domain blocklisted.
     */
    status: text("status").notNull().default("active"), // active | unsubscribed
    topics: jsonb("topics").$type<NewsletterTopics>().notNull()
      .default({ products: true, blog: true, recipes: true, offers: true, digest: true }),
    source: text("source").notNull().default("site"),   // site | checkout | admin | import
    lastSentAt: timestamp("last_sent_at", { withTimezone: true }),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_uq").on(t.email)],
);

/** One row per broadcast — manual or automated — for history and re-sending. */
export const newsletterCampaigns = pgTable("newsletter_campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  subject: text("subject").notNull().default(""),
  html: text("html").notNull().default(""),
  /** Which opt-in this went to; "all" ignores topic filtering (still honours status). */
  topic: text("topic").notNull().default("all"),
  /** manual = someone wrote it; the rest are automated senders. */
  kind: text("kind").notNull().default("manual"), // manual | digest | announce
  status: text("status").notNull().default("draft"), // draft | sending | sent | failed
  audience: integer("audience").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  lastError: text("last_error").notNull().default(""),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  seq: bigserial("seq", { mode: "number" }).notNull(), // monotonic ordering for the hash chain
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entity: text("entity").notNull().default(""),
  entityId: text("entity_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  prevHash: text("prev_hash"), // hash of the previous entry (tamper-evident chain)
  hash: text("hash"), // sha256(prevHash + canonical(this entry))
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Singleton key/value store for site settings + homepage config (jsonb blobs).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 301/302 redirect manager (Yoast-Pro style).
export const redirects = pgTable(
  "redirects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fromPath: text("from_path").notNull(),
    toPath: text("to_path").notNull(),
    code: integer("code").notNull().default(301),
    active: boolean("active").notNull().default(true),
    hits: integer("hits").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("redirects_from_uq").on(t.fromPath)],
);

// 404 monitor — logs not-found paths so admins can create redirects in one click.
export const notFoundLog = pgTable(
  "not_found_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: text("path").notNull(),
    hits: integer("hits").notNull().default(1),
    referrer: text("referrer"),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("not_found_path_uq").on(t.path)],
);

// Content revision history (WordPress-style) for blog posts and CMS pages.
export const contentRevisions = pgTable(
  "content_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(), // "blog" | "page"
    entityId: uuid("entity_id").notNull(),
    title: text("title").notNull().default(""),
    data: jsonb("data").$type<Record<string, unknown>>().notNull(),
    authorEmail: text("author_email").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_rev_entity_idx").on(t.entityType, t.entityId)],
);

// Blog comments with moderation (pending → approved/rejected).
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull(),
    parentId: uuid("parent_id"),
    authorName: text("author_name").notNull(),
    authorEmail: text("author_email").notNull().default(""),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_post_idx").on(t.postId)],
);

// Contact-form inbox.
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull().default(""),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Drag-and-drop landing pages built with the visual (GrapesJS) editor. Stores
// the generated HTML + CSS; served full-bleed at /l/<slug>.
export const landingPages = pgTable(
  "landing_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull().default("Untitled"),
    html: text("html").notNull().default(""),
    css: text("css").notNull().default(""),
    metaTitle: text("meta_title").notNull().default(""),
    metaDescription: text("meta_description").notNull().default(""),
    ogImage: text("og_image").notNull().default(""),
    noindex: boolean("noindex").notNull().default(false),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("landing_slug_uq").on(t.slug)],
);

// Full email client — a record of every outbound (Sent) message and, once
// inbound receiving is configured, incoming mail (Inbox). Powers /admin/mail.
export const emailMessages = pgTable(
  "email_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    folder: text("folder").notNull().default("sent"), // inbox | sent | drafts
    direction: text("direction").notNull().default("outbound"), // outbound | inbound
    fromAddr: text("from_addr").notNull().default(""),
    toAddr: text("to_addr").notNull().default(""),
    cc: text("cc").notNull().default(""),
    bcc: text("bcc").notNull().default(""),
    subject: text("subject").notNull().default(""),
    html: text("html").notNull().default(""),
    textBody: text("text_body").notNull().default(""),
    attachments: jsonb("attachments").$type<{ filename: string; url: string; size?: number }[]>().notNull().default([]),
    messageId: text("message_id").notNull().default(""),
    inReplyTo: text("in_reply_to").notNull().default(""),
    status: text("status").notNull().default("sent"), // sent | failed | received | draft
    errorText: text("error_text").notNull().default(""),
    isRead: boolean("is_read").notNull().default(true),
    category: text("category").notNull().default("manual"), // manual | welcome | passwordReset | orderConfirm | orderStatus | inbound
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_folder_idx").on(t.folder), index("email_created_idx").on(t.createdAt)],
);

// Returns / RMA workflow.
export const returnRequests = pgTable(
  "return_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    orderNumber: text("order_number").notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    items: jsonb("items").$type<{ name: string; qty: number }[]>().notNull().default([]),
    status: text("status").notNull().default("requested"), // requested | approved | rejected | refunded
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("returns_order_idx").on(t.orderId), index("returns_user_idx").on(t.userId)],
);

// Dynamic content modeling — user-definable content types + typed entries.
export const contentTypes = pgTable(
  "content_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(), // e.g. "property", "course", "event"
    name: text("name").notNull(),
    namePlural: text("name_plural").notNull().default(""),
    icon: text("icon").notNull().default("FileText"),
    fields: jsonb("fields").$type<{ key: string; label: string; type: string; required?: boolean; options?: string[] }[]>().notNull().default([]),
    hasPublicPage: boolean("has_public_page").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("content_types_slug_uq").on(t.slug)],
);

export const contentEntries = pgTable(
  "content_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    typeId: uuid("type_id").notNull().references(() => contentTypes.id, { onDelete: "cascade" }),
    typeSlug: text("type_slug").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    status: contentStatusEnum("status").notNull().default("draft"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("content_entries_type_idx").on(t.typeSlug), uniqueIndex("content_entries_slug_uq").on(t.typeSlug, t.slug)],
);

// Public API keys (scoped). Only the sha256 hash is stored; the full key is shown once.
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(), // display hint, e.g. "bf_live_ab12…"
    keyHash: text("key_hash").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    active: boolean("active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("api_keys_hash_uq").on(t.keyHash)],
);

// Outbound webhook endpoints + delivery log.
export const webhookEndpoints = pgTable("webhook_endpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  secret: text("secret").notNull(),
  events: jsonb("events").$type<string[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    endpointId: uuid("endpoint_id").notNull(),
    event: text("event").notNull(),
    status: text("status").notNull().default("pending"), // pending | success | failed
    responseCode: integer("response_code"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("webhook_deliv_ep_idx").on(t.endpointId)],
);

// Durable job queue — background work with retry/backoff/scheduling (kernel).
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: text("status").notNull().default("pending"), // pending | running | done | failed
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("jobs_due_idx").on(t.status, t.runAt)],
);

// Idempotency keys — dedupe double-submitted order creation.
export const idempotencyKeys = pgTable("idempotency_keys", {
  key: text("key").primaryKey(),
  orderId: uuid("order_id").notNull(),
  orderNumber: text("order_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Gift cards / store credit.
export const giftCards = pgTable(
  "gift_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    initialBalance: integer("initial_balance").notNull().default(0),
    balance: integer("balance").notNull().default(0),
    active: boolean("active").notNull().default(true),
    note: text("note"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("gift_cards_code_uq").on(t.code)],
);

/* ---------- Analytics / visitors ---------- */
export const pageViews = pgTable(
  "page_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: text("path").notNull(),
    ip: text("ip").notNull().default(""),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
    country: text("country"),
    city: text("city"),
    device: text("device"), // mobile | desktop | tablet | bot
    sessionId: text("session_id"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pv_created_idx").on(t.createdAt), index("pv_ip_idx").on(t.ip)],
);

export const bannedIps = pgTable(
  "banned_ips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ip: text("ip").notNull(),
    reason: text("reason"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("banned_ip_uq").on(t.ip)],
);

/* ---------- Payments ---------- */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "cascade" }),
    orderNumber: text("order_number"),
    provider: text("provider").notNull(), // cod | bkash | nagad | sslcommerz | simulate
    amount: integer("amount").notNull().default(0),
    status: text("status").notNull().default("initiated"), // initiated | paid | failed | cancelled
    transactionId: text("transaction_id"),
    sessionKey: text("session_key"),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pay_order_idx").on(t.orderId)],
);
