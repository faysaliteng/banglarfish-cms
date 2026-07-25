/**
 * Seeds the Banglarfish database: default admin, catalog (categories, products,
 * variants), coupons, shipping zones, CMS pages, homepage/settings, banners,
 * menus, and sample reviews. Idempotent-ish: it upserts by natural keys.
 *
 * Run:  npm run db:seed        (needs DATABASE_URL set)
 * Admin credentials are printed at the end.
 */
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import * as schema from "../src/server/db/schema";
import { defaultHomepage, defaultSettings } from "../src/server/content-defaults";
import { THEME_PRESETS } from "../src/lib/theme-presets";

const scryptAsync = promisify(scrypt);
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@banglarfish.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe#2026";
const ADMIN_PHONE = process.env.SEED_ADMIN_PHONE ?? "01700000000";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema, casing: "snake_case" });

  // ---- Admin user ----
  const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.email, ADMIN_EMAIL)).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(schema.users).values({
      email: ADMIN_EMAIL,
      phone: ADMIN_PHONE,
      passwordHash: await hashPassword(ADMIN_PASSWORD),
      fullName: "Store Administrator",
      role: "admin",
      phoneVerified: true,
      emailVerified: true,
    });
    console.log(`✓ Created admin user ${ADMIN_EMAIL}`);
  } else {
    console.log(`• Admin user ${ADMIN_EMAIL} already exists (left unchanged)`);
  }

  // ---- Categories ----
  const cats = [
    { slug: "hilsa", name: "Hilsa (Ilish)", bn: "ইলিশ", image: "/img/cat-hilsa.jpg", sort: 1 },
    { slug: "freshwater", name: "Freshwater Fish", bn: "মিঠা পানির মাছ", image: "/img/cat-freshwater.jpg", sort: 2 },
    { slug: "prawn-shrimp", name: "Prawn & Shrimp", bn: "চিংড়ি", image: "/img/cat-prawn.jpg", sort: 3 },
    { slug: "dried-fish", name: "Dried Fish (Shutki)", bn: "শুটকি", image: "/img/cat-dried.jpg", sort: 4 },
    { slug: "sea-fish", name: "Sea Fish", bn: "সামুদ্রিক মাছ", image: "/img/cat-sea.jpg", sort: 5 },
    { slug: "cut-cleaned", name: "Cut & Cleaned", bn: "কাটা মাছ", image: "/img/cat-cut.jpg", sort: 6 },
  ];
  for (const c of cats) {
    await db.insert(schema.categories).values({ ...c, active: true }).onConflictDoUpdate({ target: schema.categories.slug, set: { name: c.name, bn: c.bn, image: c.image, sort: c.sort } });
  }
  console.log(`✓ Seeded ${cats.length} categories`);

  // ---- Products (+ variants) ----
  const P = "/img/products/";
  type Seed = { slug: string; name: string; bn: string; category: string; price: number; compareAt?: number; image: string; images: string[]; stock: number; rating: number; reviews: number; isBest?: boolean; isNew?: boolean; description: string; weights: [string, number][] };
  const wStd = (base: number): [string, number][] => [["500g", Math.round(base / 2)], ["1kg", base], ["2kg", base * 2], ["5kg", base * 5]];
  const wHalf = (base: number): [string, number][] => [["250g", Math.round(base / 4)], ["500g", Math.round(base / 2)], ["1kg", base]];

  const productSeeds: Seed[] = [
    { slug: "padma-hilsa-1kg", name: "Padma Hilsa (Ilish)", bn: "পদ্মার ইলিশ", category: "hilsa", price: 1850, compareAt: 2100, image: P + "padma-hilsa.jpg", images: [P + "padma-hilsa.jpg", P + "chandpur-hilsa.jpg"], stock: 45, rating: 4.9, reviews: 128, isBest: true, description: "Premium hilsa from the Padma river. Rich in Omega-3, deep flavor, and the pride of Bengali cuisine. Cleaned, iced and delivered fresh.", weights: wStd(1850) },
    { slug: "chandpur-hilsa", name: "Chandpur Hilsa", bn: "চাঁদপুরের ইলিশ", category: "hilsa", price: 1650, image: P + "chandpur-hilsa.jpg", images: [P + "chandpur-hilsa.jpg"], stock: 30, rating: 4.8, reviews: 92, isBest: true, description: "Authentic Chandpur hilsa with signature aroma. Sourced from trusted fishermen.", weights: wStd(1650) },
    { slug: "rohu-fish", name: "Rohu (Rui)", bn: "রুই মাছ", category: "freshwater", price: 380, compareAt: 450, image: P + "rohu-fish.jpg", images: [P + "rohu-fish.jpg", P + "katla-fish.jpg"], stock: 120, rating: 4.7, reviews: 210, isBest: true, description: "Farm-fresh rohu, a Bengali household favorite. Excellent for curry and bhuna.", weights: wStd(380) },
    { slug: "katla-fish", name: "Katla", bn: "কাতলা মাছ", category: "freshwater", price: 420, image: P + "katla-fish.jpg", images: [P + "katla-fish.jpg"], stock: 80, rating: 4.6, reviews: 145, description: "Big-headed carp with tender white meat, perfect for korma and doi maach.", weights: wStd(420) },
    { slug: "pangash-fish", name: "Pangash", bn: "পাঙ্গাশ মাছ", category: "freshwater", price: 260, image: P + "pangash-fish.jpg", images: [P + "pangash-fish.jpg"], stock: 200, rating: 4.4, reviews: 88, description: "Boneless, mild and affordable — ideal for everyday meals.", weights: wStd(260) },
    { slug: "koi-fish", name: "Koi (Climbing Perch)", bn: "কই মাছ", category: "freshwater", price: 520, image: P + "koi-fish.jpg", images: [P + "koi-fish.jpg"], stock: 60, rating: 4.7, reviews: 74, isNew: true, description: "Live-caught koi, prized for shorshe and jhal preparations.", weights: wHalf(520) },
    { slug: "tilapia", name: "Tilapia", bn: "তেলাপিয়া", category: "freshwater", price: 220, image: P + "tilapia.jpg", images: [P + "tilapia.jpg"], stock: 180, rating: 4.3, reviews: 66, description: "Affordable, mild-flavored tilapia.", weights: wStd(220) },
    { slug: "magur-fish", name: "Magur (Catfish)", bn: "মাগুর মাছ", category: "freshwater", price: 560, image: P + "magur-fish.jpg", images: [P + "magur-fish.jpg"], stock: 45, rating: 4.6, reviews: 51, description: "Live magur — traditional recovery food.", weights: wHalf(560) },
    { slug: "shing-fish", name: "Shing (Stinging Catfish)", bn: "শিং মাছ", category: "freshwater", price: 640, image: P + "shing-fish.jpg", images: [P + "shing-fish.jpg"], stock: 35, rating: 4.7, reviews: 47, description: "Highly nutritious shing, farmed fresh.", weights: wHalf(640) },
    { slug: "golda-chingri", name: "Golda Chingri (Giant Prawn)", bn: "গলদা চিংড়ি", category: "prawn-shrimp", price: 1450, compareAt: 1650, image: P + "golda-chingri.jpg", images: [P + "golda-chingri.jpg", P + "bagda-chingri.jpg"], stock: 40, rating: 4.9, reviews: 165, isBest: true, description: "Jumbo freshwater prawns — the star of malaikari and prawn cutlets.", weights: wStd(1450) },
    { slug: "bagda-chingri", name: "Bagda Chingri (Tiger Prawn)", bn: "বাগদা চিংড়ি", category: "prawn-shrimp", price: 1250, image: P + "bagda-chingri.jpg", images: [P + "bagda-chingri.jpg"], stock: 55, rating: 4.8, reviews: 112, description: "Bay of Bengal tiger prawns, firm and sweet.", weights: wStd(1250) },
    { slug: "chapa-shutki", name: "Chapa Shutki", bn: "চাপা শুটকি", category: "dried-fish", price: 780, image: P + "chapa-shutki.jpg", images: [P + "chapa-shutki.jpg"], stock: 25, rating: 4.5, reviews: 42, description: "Traditional fermented dried fish with authentic Sylheti flavor.", weights: wHalf(780) },
    { slug: "loitta-shutki", name: "Loitta Shutki (Bombay Duck)", bn: "লইট্যা শুটকি", category: "dried-fish", price: 950, image: P + "loitta-shutki.jpg", images: [P + "loitta-shutki.jpg"], stock: 30, rating: 4.6, reviews: 58, isNew: true, description: "Sun-dried loitta, hygienically processed. Bhuna staple.", weights: wHalf(950) },
    { slug: "rupchanda-fish", name: "Rupchanda (Pomfret)", bn: "রূপচাঁদা", category: "sea-fish", price: 1150, image: P + "rupchanda-fish.jpg", images: [P + "rupchanda-fish.jpg"], stock: 35, rating: 4.8, reviews: 89, description: "Silver pomfret from the Bay of Bengal. Fried whole or in mustard curry.", weights: wStd(1150) },
    { slug: "tuna-steak", name: "Tuna Steak", bn: "টুনা স্টেক", category: "sea-fish", price: 890, image: P + "tuna-steak.jpg", images: [P + "tuna-steak.jpg"], stock: 50, rating: 4.5, reviews: 36, isNew: true, description: "Sushi-grade tuna steaks, vacuum-sealed.", weights: wHalf(890) },
    { slug: "rohu-cut-cleaned", name: "Rohu — Cut & Cleaned", bn: "রুই কাটা মাছ", category: "cut-cleaned", price: 440, image: P + "rohu-cut-cleaned.jpg", images: [P + "rohu-cut-cleaned.jpg"], stock: 90, rating: 4.7, reviews: 120, description: "Rohu chopped into curry-ready pieces, scales removed.", weights: wStd(440) },
    { slug: "hilsa-cut", name: "Hilsa — Cut Pieces", bn: "ইলিশ কাটা", category: "cut-cleaned", price: 1950, image: P + "hilsa-cut.jpg", images: [P + "hilsa-cut.jpg"], stock: 25, rating: 4.9, reviews: 60, isBest: true, description: "Hilsa in perfect gada + peti pieces, cleaned and iced.", weights: wHalf(1950) },
    { slug: "prawn-peeled", name: "Prawn — Peeled & Deveined", bn: "খোসা ছাড়ানো চিংড়ি", category: "cut-cleaned", price: 1650, image: P + "prawn-peeled.jpg", images: [P + "prawn-peeled.jpg"], stock: 40, rating: 4.8, reviews: 74, description: "Ready-to-cook peeled prawns.", weights: wHalf(1650) },
  ];

  for (const p of productSeeds) {
    const [row] = await db
      .insert(schema.products)
      .values({
        slug: p.slug, name: p.name, bn: p.bn, categorySlug: p.category, price: p.price, compareAt: p.compareAt ?? null,
        unit: "kg", description: p.description, image: p.image, images: p.images, weightOptions: p.weights.map((w) => w[0]),
        stock: p.stock, rating: p.rating, reviewsCount: p.reviews, isBestSeller: !!p.isBest, isNewArrival: !!p.isNew, active: true,
      })
      .onConflictDoUpdate({
        target: schema.products.slug,
        set: { name: p.name, price: p.price, compareAt: p.compareAt ?? null, image: p.image, images: p.images, stock: p.stock, isBestSeller: !!p.isBest, isNewArrival: !!p.isNew, description: p.description },
      })
      .returning({ id: schema.products.id });
    await db.delete(schema.productVariants).where(eq(schema.productVariants.productId, row.id));
    await db.insert(schema.productVariants).values(
      p.weights.map(([label, price], idx) => ({ productId: row.id, label, price, stock: Math.round(p.stock / p.weights.length), sort: idx })),
    );
  }
  console.log(`✓ Seeded ${productSeeds.length} products with variants`);

  // ---- Coupons ----
  const coupons = [
    { code: "WELCOME10", type: "percent" as const, value: 10, minSubtotal: 500, expiresAt: new Date("2026-12-31"), active: true, usageLimit: 1000 },
    { code: "HILSA50", type: "fixed" as const, value: 50, minSubtotal: 1500, expiresAt: new Date("2026-09-30"), active: true, usageLimit: 500 },
    { code: "FREESHIP", type: "fixed" as const, value: 80, minSubtotal: 1000, expiresAt: new Date("2026-08-31"), active: true, usageLimit: 2000 },
  ];
  for (const c of coupons) await db.insert(schema.coupons).values(c).onConflictDoUpdate({ target: schema.coupons.code, set: { value: c.value, active: c.active } });
  console.log(`✓ Seeded ${coupons.length} coupons`);

  // ---- Shipping zones ----
  const zones = [
    { name: "Inside Dhaka", cities: ["Dhaka", "Gulshan", "Uttara", "Dhanmondi", "Mirpur"], rate: 60, freeAbove: 2000, eta: "Same-day", active: true, sort: 1 },
    { name: "Dhaka Suburbs", cities: ["Narayanganj", "Savar", "Gazipur"], rate: 100, freeAbove: 2500, eta: "Next-day", active: true, sort: 2 },
    { name: "Chattogram Division", cities: ["Chattogram", "Cox's Bazar"], rate: 180, freeAbove: 3500, eta: "1-2 days", active: true, sort: 3 },
    { name: "Sylhet Division", cities: ["Sylhet", "Moulvibazar"], rate: 200, freeAbove: 3500, eta: "1-2 days", active: true, sort: 4 },
    { name: "Nationwide", cities: ["All other cities"], rate: 250, freeAbove: 5000, eta: "2-3 days", active: true, sort: 5 },
  ];
  const existingZones = await db.select().from(schema.shippingZones).limit(1);
  if (existingZones.length === 0) {
    await db.insert(schema.shippingZones).values(zones);
    console.log(`✓ Seeded ${zones.length} shipping zones`);
  }

  // ---- CMS pages ----
  const pages = [
    { slug: "about", title: "About Banglarfish", body: "Banglarfish was founded to bring the freshest Bangladeshi fish and seafood directly to your kitchen. We partner with fishermen on the Padma, Meghna, and Bay of Bengal, and dispatch every order within hours of catch — cleaned, iced, and cold-chain packed." },
    { slug: "contact", title: "Contact Us", body: "Call us at +880 1000-000000, email hello@banglarfish.com, or visit our office at House 12, Road 5, Dhanmondi, Dhaka. We answer between 9 AM and 9 PM every day." },
    { slug: "faq", title: "Frequently Asked Questions", body: "Q: When do you deliver?\nA: Same-day in Dhaka for orders before 11 AM.\n\nQ: Is the fish really fresh?\nA: 100%. If not, we refund or replace.\n\nQ: Which areas do you cover?\nA: All major cities in Bangladesh." },
    { slug: "shipping", title: "Shipping & Delivery", body: "Same-day delivery in Dhaka for orders placed before 11 AM. Next-day for Chattogram and Sylhet. Free delivery on orders over 2,000 BDT." },
    { slug: "returns", title: "Returns & Refunds", body: "If your order arrives damaged or not fresh, contact us within 2 hours of delivery for a full refund or replacement." },
    { slug: "privacy", title: "Privacy Policy", body: "We collect only the information needed to fulfill your order and never sell your data." },
    { slug: "terms", title: "Terms of Service", body: "By ordering from Banglarfish you agree to these terms." },
  ];
  for (const pg of pages) await db.insert(schema.pages).values({ ...pg, status: "published" as const }).onConflictDoUpdate({ target: schema.pages.slug, set: { title: pg.title, body: pg.body, status: "published" } });
  console.log(`✓ Seeded ${pages.length} CMS pages`);

  // ---- Homepage & settings singletons ----
  await db.insert(schema.settings).values({ key: "homepage", value: defaultHomepage as unknown as Record<string, unknown> }).onConflictDoUpdate({ target: schema.settings.key, set: { value: defaultHomepage as unknown as Record<string, unknown> } });
  await db.insert(schema.settings).values({ key: "store", value: defaultSettings as unknown as Record<string, unknown> }).onConflictDoUpdate({ target: schema.settings.key, set: { value: defaultSettings as unknown as Record<string, unknown> } });
  // Default theme = Glass 3D (fullbleed hero) — matches the intended design. Not overwritten on re-seed.
  await db.insert(schema.settings).values({ key: "theme", value: THEME_PRESETS.glass as unknown as Record<string, unknown> }).onConflictDoNothing();
  console.log("✓ Seeded homepage + store settings + theme");

  // ---- Blog posts ----
  const posts = [
    { slug: "how-to-pick-fresh-hilsa", title: "How to Pick the Freshest Hilsa (Ilish)", excerpt: "Bright eyes, firm flesh, and a silvery shine — a quick guide to choosing perfect ilish.", category: "Guides", tags: ["hilsa", "buying-guide"], coverImage: "/img/products/padma-hilsa.jpg", author: "Banglarfish Kitchen", body: "<h2>The eyes tell the story</h2><p>Fresh hilsa has clear, bright, slightly bulging eyes. Cloudy or sunken eyes mean the fish is past its prime.</p><h2>Firmness & shine</h2><p>Press gently — the flesh should spring back. A natural silver shine (not dull grey) signals freshness.</p><p>At Banglarfish we source Padma & Meghna ilish daily and ice it within hours of catch.</p>" },
    { slug: "5-classic-bengali-fish-recipes", title: "5 Classic Bengali Fish Recipes to Try This Week", excerpt: "From shorshe ilish to doi maach — timeless recipes for everyday and festive tables.", category: "Recipes", tags: ["recipes", "bengali"], coverImage: "/img/products/rohu-fish.jpg", author: "Banglarfish Kitchen", body: "<h2>1. Shorshe Ilish</h2><p>Hilsa in a mustard gravy — the crown of Bengali cuisine.</p><h2>2. Doi Maach</h2><p>Rohu simmered in spiced yogurt.</p><h2>3. Macher Jhol</h2><p>A light, everyday fish curry.</p><h2>4. Chingri Malaikari</h2><p>Prawns in coconut milk.</p><h2>5. Paturi</h2><p>Fish steamed in banana leaf.</p>" },
    { slug: "why-cold-chain-matters", title: "Why Cold-Chain Delivery Matters for Fish", excerpt: "Temperature is everything. Here's how we keep your fish fresh from ghat to gate.", category: "Sourcing", tags: ["quality", "delivery"], coverImage: "/img/products/golda-chingri.jpg", author: "Banglarfish Team", body: "<p>Fish spoils fast above 4°C. Our cold-chain keeps every order iced and insulated from dispatch to your door, locking in freshness and safety.</p>" },
  ];
  for (const p of posts) {
    await db.insert(schema.blogPosts).values({ ...p, status: "published" as const, publishedAt: new Date("2026-07-20") }).onConflictDoUpdate({ target: schema.blogPosts.slug, set: { title: p.title, body: p.body, status: "published" } });
  }
  console.log(`✓ Seeded ${posts.length} blog posts`);

  // ---- Menus ----
  await db.insert(schema.menus).values({ location: "header", items: [{ label: "Blog", href: "/blog" }, { label: "About", href: "/pages/about" }] }).onConflictDoNothing();
  await db.insert(schema.menus).values({ location: "footer", items: [{ label: "About", href: "/pages/about" }, { label: "Contact", href: "/pages/contact" }, { label: "FAQ", href: "/pages/faq" }] }).onConflictDoNothing();

  await pool.end();
  console.log("\n=====================================================");
  console.log("  Seed complete. Admin login:");
  console.log(`    Email:    ${ADMIN_EMAIL}`);
  console.log(`    Password: ${ADMIN_PASSWORD}`);
  console.log("  Change this password after first login (Account → Security).");
  console.log("=====================================================\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
