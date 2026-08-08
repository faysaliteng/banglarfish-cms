ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "meta_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "meta_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "og_image" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "landing_pages" ADD COLUMN IF NOT EXISTS "noindex" boolean DEFAULT false NOT NULL;