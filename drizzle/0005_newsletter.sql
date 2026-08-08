-- Newsletter: real subscriber lifecycle + campaign history.
--
-- Unsubscribing used to DELETE the row, so anyone who later typed their address
-- into the footer form was silently re-subscribed. Status is kept instead.
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "topics" jsonb DEFAULT '{"products":true,"blog":true,"recipes":true,"offers":true,"digest":true}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'site' NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "last_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN IF NOT EXISTS "unsubscribed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newsletter_status_idx" ON "newsletter_subscribers" ("status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "newsletter_campaigns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject" text DEFAULT '' NOT NULL,
  "html" text DEFAULT '' NOT NULL,
  "topic" text DEFAULT 'all' NOT NULL,
  "kind" text DEFAULT 'manual' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "audience" integer DEFAULT 0 NOT NULL,
  "sent" integer DEFAULT 0 NOT NULL,
  "failed" integer DEFAULT 0 NOT NULL,
  "last_error" text DEFAULT '' NOT NULL,
  "created_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "sent_at" timestamp with time zone
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "newsletter_campaigns" ADD CONSTRAINT "newsletter_campaigns_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "newsletter_campaigns_created_idx" ON "newsletter_campaigns" ("created_at");
