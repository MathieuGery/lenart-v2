DO $$ BEGIN CREATE TYPE "public"."promo_code_type" AS ENUM('percentage', 'fixed'); EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "galleries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"link" varchar(1000) NOT NULL,
	"date" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" "promo_code_type" NOT NULL,
	"value" integer NOT NULL,
	"max_usage" integer NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"formula_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "photo_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "photo_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "collection_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "address" varchar(500);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "city" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "country" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "amazon_link" varchar(1000);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promo_code" varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "discount_cents" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_formula_id_pricing_formulas_id_fk" FOREIGN KEY ("formula_id") REFERENCES "public"."pricing_formulas"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "galleries_code_idx" ON "galleries" USING btree ("code");--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "order_items" ADD CONSTRAINT "order_items_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE set null ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN null; END $$;