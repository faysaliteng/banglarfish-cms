// Server-only Postgres connection (node-postgres + Drizzle).
// Never import this from client/route components — only from server-function
// handlers. The `**/server/**` import-protection guard enforces that at build:
// any file under a `server/` directory is barred from the client bundle.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __bfPool?: Pool };

function makePool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL database.",
    );
  }
  return new Pool({
    connectionString,
    max: Number(process.env.DB_POOL_MAX ?? 10),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
}

// Reuse a single pool across HMR reloads / warm server invocations.
const pool = globalForDb.__bfPool ?? makePool();
if (process.env.NODE_ENV !== "production") globalForDb.__bfPool = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export { schema };
export * from "./schema";
