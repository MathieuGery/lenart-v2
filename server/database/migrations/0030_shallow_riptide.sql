ALTER TABLE "orders" ADD COLUMN "print_photo_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "print_photo_filename" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_print_photo_id_photos_id_fk" FOREIGN KEY ("print_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;