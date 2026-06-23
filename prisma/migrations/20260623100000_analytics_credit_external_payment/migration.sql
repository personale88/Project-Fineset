-- Idempotent credit recharge via payment provider external id
ALTER TABLE "AnalyticsCreditLedger" ADD COLUMN IF NOT EXISTS "externalPaymentId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsCreditLedger_externalPaymentId_key"
  ON "AnalyticsCreditLedger"("externalPaymentId")
  WHERE "externalPaymentId" IS NOT NULL;
