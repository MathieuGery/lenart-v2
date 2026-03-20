DO $$ BEGIN
  CREATE TYPE "contact_message_status" AS ENUM('new', 'read', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "contact_messages" ALTER COLUMN "status" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "contact_messages"
  ALTER COLUMN "status" TYPE "contact_message_status"
  USING "status"::text::"contact_message_status";
--> statement-breakpoint
ALTER TABLE "contact_messages"
  ALTER COLUMN "status" SET DEFAULT 'new'::"contact_message_status";
