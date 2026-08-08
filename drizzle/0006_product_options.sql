-- Per-product preparation choices ("Processing: whole / family cut").
-- Distinct from product_variants: a variant is its own priced, stocked SKU,
-- whereas these adjust the price slightly and must reach the person cutting.
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "option_groups" jsonb DEFAULT '[]'::jsonb NOT NULL;
