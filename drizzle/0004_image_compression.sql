ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "original_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "optimized_bytes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "optimized_at" timestamp with time zone;