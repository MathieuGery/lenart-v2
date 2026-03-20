CREATE TABLE IF NOT EXISTS "settings" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
INSERT INTO "settings" ("key", "value") VALUES ('jpeg_quality', '95') ON CONFLICT DO NOTHING;
