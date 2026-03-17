-- Add cash_payment boolean column
ALTER TABLE "orders" ADD COLUMN "cash_payment" boolean NOT NULL DEFAULT false;

-- Migrate existing cash status orders to pending + cash_payment = true
UPDATE "orders" SET "cash_payment" = true, "status" = 'pending' WHERE "status" = 'cash';

-- Remove 'cash' from order_status enum (PostgreSQL workaround — cannot DROP a value directly)
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
CREATE TYPE "public"."order_status_new" AS ENUM ('pending', 'paid', 'cancelled', 'expired', 'failed');
ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."order_status_new"
  USING "status"::text::"public"."order_status_new";
DROP TYPE "public"."order_status";
ALTER TYPE "public"."order_status_new" RENAME TO "order_status";
ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';
