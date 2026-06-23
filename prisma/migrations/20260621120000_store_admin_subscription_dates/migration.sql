-- Store subscription / data retention dates for master admin portfolio
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "dataExpiryAt" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "renewalDueAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Store_dataExpiryAt_idx" ON "Store"("dataExpiryAt");
CREATE INDEX IF NOT EXISTS "Store_renewalDueAt_idx" ON "Store"("renewalDueAt");
