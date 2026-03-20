CREATE TABLE IF NOT EXISTS "pricing_formulas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "base_price_cents" integer NOT NULL DEFAULT 0,
  "is_featured" boolean NOT NULL DEFAULT false,
  "digital_photos_count" integer NOT NULL DEFAULT 0,
  "print_details" varchar(255),
  "extra_photo_price_cents" integer,
  "is_tour_complete" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pricing_formula_features" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "formula_id" uuid NOT NULL,
  "feature_text" varchar(500) NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "pricing_formula_features"
    ADD CONSTRAINT "pricing_formula_features_formula_id_fk"
    FOREIGN KEY ("formula_id") REFERENCES "public"."pricing_formulas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "pricing_formulas" ("id", "name", "description", "base_price_cents", "is_featured", "digital_photos_count", "print_details", "extra_photo_price_cents", "is_tour_complete", "is_active", "display_order") VALUES
('b6b452bd-24b1-4937-91e5-cab85916b4ea', 'Formule PODIUM', 'Pour voir les choses en grand !', 1500, false, 3, null, null, false, true, 3),
('4ce5a49a-a1b4-4ad0-92ee-525bef31d241', 'Formule GRAND PRIX', 'Pour les indécis', 1600, false, 1, '1 impression A4', null, false, true, 4),
('784120ae-d97f-4eb3-bc27-0b318c8e8d65', 'Formule OXER', 'Revivez deux moments forts, et imprimez celui qui vous fait vibrer le plus', 1200, false, 2, '1 impression 10x15cm', 500, false, true, 2),
('4c734b83-74c6-43be-b348-b1f7d8496444', 'Formule PADDOCK', 'Idéal pour un souvenir unique de cette journée', 800, false, 1, '1 impression 10x15cm', null, false, true, 1),
('c321befe-2be6-4111-a458-450cf67bc0fe', 'Formule TOUR D''HONNEUR', 'Pour les grands collectionneurs', 3500, false, 0, '1 impression 10x15cm', null, true, true, 5),
('f6854962-163d-473b-a161-2a692ff805a3', 'Personnalisé', 'Réalisez vos projets les plus ambitieux avec la formule Personnalisée.', 0, true, 0, null, null, false, true, 6)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "pricing_formula_features" ("id", "formula_id", "feature_text", "display_order") VALUES
('1b837c25-c67d-4169-a538-203cbc382b48', '4c734b83-74c6-43be-b348-b1f7d8496444', '1 photo en format numérique', 1),
('16d2d9cd-1fb6-420f-8067-9f899e964dd6', '4c734b83-74c6-43be-b348-b1f7d8496444', '1 impression 10x15cm', 2),
('3916243e-4374-49aa-9de5-25c422e40798', '4ce5a49a-a1b4-4ad0-92ee-525bef31d241', '1 photo en format numérique', 1),
('a38841ac-e115-468e-b2e3-c03f1c93302f', '4ce5a49a-a1b4-4ad0-92ee-525bef31d241', '1 impression A4', 2),
('a0dfc4f5-c745-4225-bd29-541af8bad4e0', '784120ae-d97f-4eb3-bc27-0b318c8e8d65', '2 photos en format numérique', 1),
('856c20f9-177b-4277-9854-ed19664387c3', '784120ae-d97f-4eb3-bc27-0b318c8e8d65', '1 impression 10x15cm', 2),
('9f1e1d06-9a4e-4f94-86b3-9d4a4ef89438', '784120ae-d97f-4eb3-bc27-0b318c8e8d65', '+5 € par photo supplémentaire en format numérique', 3),
('c88c667c-845c-40f0-9fbc-66df314afec7', 'b6b452bd-24b1-4937-91e5-cab85916b4ea', '3 photos en format numérique', 1),
('467b27cb-2db0-4735-bcf3-8a616554cd49', 'c321befe-2be6-4111-a458-450cf67bc0fe', 'toutes les photos du tour en format numérique', 1),
('fecf5846-12e0-4a96-b887-a7d952930853', 'c321befe-2be6-4111-a458-450cf67bc0fe', '1 impression 10x15cm', 2)
ON CONFLICT DO NOTHING;
