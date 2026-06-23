-- Reconcile index naming and externalPaymentId unique constraint with Prisma schema.
-- Idempotent: safe when objects already exist or were partially applied.

-- Align externalPaymentId unique index with @unique (non-partial).
DROP INDEX IF EXISTS "AnalyticsCreditLedger_externalPaymentId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsCreditLedger_externalPaymentId_key"
  ON "AnalyticsCreditLedger"("externalPaymentId");

-- Rename legacy manual Visit index names to Prisma convention.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'visit_store_date_status_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Visit_storeId_visitDate_purchaseStatus_idx'
  ) THEN
    ALTER INDEX visit_store_date_status_idx
      RENAME TO "Visit_storeId_visitDate_purchaseStatus_idx";
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'visit_store_date_ctype_source_idx'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'Visit_storeId_visitDate_customerType_sourceChannel_idx'
  ) THEN
    ALTER INDEX visit_store_date_ctype_source_idx
      RENAME TO "Visit_storeId_visitDate_customerType_sourceChannel_idx";
  END IF;
END $$;

-- Ensure Prisma-named Visit indexes exist on fresh/partial states.
CREATE INDEX IF NOT EXISTS "Visit_storeId_visitDate_purchaseStatus_idx"
  ON "Visit" ("storeId", "visitDate" DESC, "purchaseStatus");

CREATE INDEX IF NOT EXISTS "Visit_storeId_visitDate_customerType_sourceChannel_idx"
  ON "Visit" ("storeId", "visitDate" DESC, "customerType", "sourceChannel");

-- Drop legacy names if duplicates remain after rename/create.
DROP INDEX IF EXISTS visit_store_date_status_idx;
DROP INDEX IF EXISTS visit_store_date_ctype_source_idx;
