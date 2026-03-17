CREATE TYPE "order_status" AS ENUM('pending', 'paid', 'cancelled', 'expired', 'failed');
--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "orders"
  ALTER COLUMN "status" TYPE "order_status"
  USING "status"::"order_status";
--> statement-breakpoint
ALTER TABLE "orders"
  ALTER COLUMN "status" SET DEFAULT 'pending'::"order_status";
