-- Add marketing opt-in flag on Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
