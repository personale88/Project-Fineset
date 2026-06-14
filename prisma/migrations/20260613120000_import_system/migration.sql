-- Dynamic import system: batch tracking + import history

ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

ALTER TABLE "StaffCallLog" ADD COLUMN IF NOT EXISTS "importBatchId" TEXT;
ALTER TABLE "StaffCallLog" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ImportHistory" (
  "id" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "featureKey" TEXT NOT NULL,
  "fileName" TEXT,
  "storeId" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL,
  "successCount" INTEGER NOT NULL,
  "errorCount" INTEGER NOT NULL,
  "newCustomers" INTEGER NOT NULL,
  "repeatCustomers" INTEGER NOT NULL,
  "importedByAuthId" TEXT NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rollbackAvailableUntil" TIMESTAMP(3) NOT NULL,
  "rolledBackAt" TIMESTAMP(3),
  CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ImportHistory_batchId_key" ON "ImportHistory"("batchId");
CREATE INDEX IF NOT EXISTS "ImportHistory_featureKey_idx" ON "ImportHistory"("featureKey");
CREATE INDEX IF NOT EXISTS "ImportHistory_storeId_importedAt_idx" ON "ImportHistory"("storeId", "importedAt" DESC);
CREATE INDEX IF NOT EXISTS "ImportHistory_importedByAuthId_idx" ON "ImportHistory"("importedByAuthId");
CREATE INDEX IF NOT EXISTS "Visit_importBatchId_idx" ON "Visit"("importBatchId");
CREATE INDEX IF NOT EXISTS "StaffCallLog_importBatchId_idx" ON "StaffCallLog"("importBatchId");

ALTER TABLE "ImportHistory"
  ADD CONSTRAINT "ImportHistory_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
