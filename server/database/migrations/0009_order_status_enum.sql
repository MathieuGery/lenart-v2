DO $$ BEGIN
  CREATE TYPE "order_status" AS ENUM('pending', 'paid', 'cancelled', 'expired', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "order_status"
  USING "status"::text::"order_status";
--> statement-breakpoint
ALTER TABLE "orders"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"order_status";
