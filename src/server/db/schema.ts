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
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ---------- Enums ---------- */
export const roleEnum = pgEnum("role", ["customer", "staff", "manager", "admin"]);
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
    phoneVerified: boolean("phone_verified").notNull().default(false),
    emailVerified: boolean("email_verified").notNull().default(false),
    status: text("status").notNull().default("active"), // active | blocked
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
    label: text("label").notNull(), // e.g. "500g", "1kg", "2kg"
    price: integer("price").notNull().default(0),
    stock: integer("stock").notNull().default(0),
    sku: text("sku"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("variants_product_idx").on(t.productId)],
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
    trackingNumber: text("tracking_number"),
    courier: text("courier"),
    transactionId: text("transaction_id"),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
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

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_uq").on(t.email)],
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: text("actor_email"),
  action: text("action").notNull(),
  entity: text("entity").notNull().default(""),
  entityId: text("entity_id"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Singleton key/value store for site settings + homepage config (jsonb blobs).
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
