-- Make photo_id nullable (allow orders with just filenames)
DO $$ BEGIN
  ALTER TABLE "order_items" ALTER COLUMN "photo_id" DROP NOT NULL;
EXCEPTION WHEN others THEN null;
END $$;
--> statement-breakpoint
-- Add photo_filename column for deferred photo linking
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "photo_filename" varchar(255);
--> statement-breakpoint
-- Backfill photo_filename from existing linked photos
UPDATE "order_items" SET "photo_filename" = p."filename"
FROM "photos" p WHERE "order_items"."photo_id" = p."id" AND "order_items"."photo_filename" IS NULL;
