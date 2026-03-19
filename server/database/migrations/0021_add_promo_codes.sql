CREATE TYPE "public"."promo_code_type" AS ENUM ('percentage', 'fixed');

CREATE TABLE "promo_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "code" varchar(50) NOT NULL UNIQUE,
  "type" "promo_code_type" NOT NULL,
  "value" integer NOT NULL,
  "max_usage" integer NOT NULL,
  "usage_count" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "formula_id" uuid REFERENCES "pricing_formulas"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "orders" ADD COLUMN "promo_code" varchar(50);
ALTER TABLE "orders" ADD COLUMN "discount_cents" integer NOT NULL DEFAULT 0;
