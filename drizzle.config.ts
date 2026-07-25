import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://banglarfish:banglarfish@localhost:5432/banglarfish",
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
