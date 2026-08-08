/**
 * Seeds authentic Bengali content: fish recipes + blog articles (blog_posts) and
 * "Banglar Fish" fish masala products (products). Idempotent: upserts by slug.
 * Run on the server:  DATABASE_URL=... node --import tsx scripts/seed-bengali.ts
 */
import { readFileSync } from "node:fs";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

type Post = { slug: string; title: string; excerpt: string; body: string; category: string; tags: string[]; coverImage: string; author: string; focusKeyword?: string };
type Masala = { slug: string; name: string; bn: string; description: string; price: number; compareAt?: number; unit: string; categorySlug: string; tags: string[]; image: string; sku: string };

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema, casing: "snake_case" });

  const data = JSON.parse(readFileSync(new URL("./bengali-content.json", import.meta.url), "utf8")) as {
    recipes: Post[]; blogs: Post[]; masala: Masala[];
  };

  const now = new Date();
  let posts = 0, prods = 0;

  // Ensure the Fish Masala category exists.
  await db.insert(schema.categories).values({ slug: "fish-masala", name: "Fish Masala", bn: "মাছের মসলা", image: "/img/cat-cut.jpg", sort: 50 })
    .onConflictDoNothing({ target: schema.categories.slug });

  // Recipes + blogs -> blog_posts (published now).
  for (const p of [...data.recipes, ...data.blogs]) {
    await db.insert(schema.blogPosts).values({
      slug: p.slug, title: p.title, excerpt: p.excerpt, body: p.body, coverImage: p.coverImage,
      author: p.author, category: p.category, tags: p.tags ?? [], status: "published", publishedAt: now,
      focusKeyword: p.focusKeyword ?? "", noindex: false,
    }).onConflictDoNothing({ target: schema.blogPosts.slug });
    posts++;
  }

  // Masala -> products.
  for (const m of data.masala) {
    await db.insert(schema.products).values({
      slug: m.slug, name: m.name, bn: m.bn, categorySlug: m.categorySlug || "fish-masala",
      price: m.price, compareAt: m.compareAt ?? null, unit: m.unit || "প্যাক", description: m.description,
      image: m.image, images: [m.image], weightOptions: [], stock: 100, isNewArrival: true, active: true,
      tags: m.tags ?? [], sku: m.sku, brand: "Banglar Fish", taxClass: "standard",
    }).onConflictDoNothing({ target: schema.products.slug });
    prods++;
  }

  void sql;
  console.log(`Seeded: ${posts} posts (recipes+blogs), ${prods} masala products.`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
