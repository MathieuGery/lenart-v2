ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "address" varchar(500);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "city" varchar(255);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "postal_code" varchar(20);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "country" varchar(255);
