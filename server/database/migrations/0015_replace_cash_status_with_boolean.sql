-- Add cash_payment boolean column (the 'cash' enum value from 0013 is no longer added)
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "cash_payment" boolean NOT NULL DEFAULT false;
