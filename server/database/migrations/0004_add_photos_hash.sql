ALTER TABLE "photos" ADD COLUMN IF NOT EXISTS "hash" varchar(64);
--> statement-breakpoint
UPDATE "photos" SET "hash" = md5("key") WHERE "hash" IS NULL;
--> statement-breakpoint
ALTER TABLE "photos" ALTER COLUMN "hash" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "photos_collection_hash_idx" ON "photos" ("collection_id", "hash");
