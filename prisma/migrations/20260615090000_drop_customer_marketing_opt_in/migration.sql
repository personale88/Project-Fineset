-- Remove marketing opt-in flag from Customer (feature removed from app)
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "marketingOptIn";
