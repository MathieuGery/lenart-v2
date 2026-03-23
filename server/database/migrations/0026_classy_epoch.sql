CREATE TYPE "public"."business_status" AS ENUM('in_progress', 'completed');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "business_status" "business_status" DEFAULT 'in_progress' NOT NULL;