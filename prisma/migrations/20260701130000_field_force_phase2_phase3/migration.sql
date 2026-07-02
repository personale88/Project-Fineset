-- Visit location capture fields
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "submissionLatitude" DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "submissionLongitude" DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "locationAccuracyMeters" DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "locationCapturedAt" TIMESTAMP(3);
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "locationStatus" "LocationCaptureStatus";
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "locationAddress" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "submissionIp" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "submissionUserAgent" TEXT;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "distanceFromStoreMeters" DOUBLE PRECISION;
ALTER TABLE "Visit" ADD COLUMN IF NOT EXISTS "outsideApprovedArea" BOOLEAN;

CREATE TYPE "LocationCaptureRecordType" AS ENUM ('FIELD_SALE', 'VISIT');

CREATE TABLE IF NOT EXISTS "LocationCaptureException" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "recordType" "LocationCaptureRecordType" NOT NULL,
    "issuedByAuthId" TEXT,
    "issuedByEmail" TEXT,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationCaptureException_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LocationCaptureException_storeId_staffId_recordType_expiresAt_idx"
ON "LocationCaptureException"("storeId", "staffId", "recordType", "expiresAt");

CREATE INDEX IF NOT EXISTS "FieldSale_storeId_outsideApprovedArea_idx"
ON "FieldSale"("storeId", "outsideApprovedArea");

CREATE INDEX IF NOT EXISTS "FieldSale_storeId_locationStatus_idx"
ON "FieldSale"("storeId", "locationStatus");

CREATE INDEX IF NOT EXISTS "Visit_storeId_outsideApprovedArea_idx"
ON "Visit"("storeId", "outsideApprovedArea");

CREATE INDEX IF NOT EXISTS "Visit_storeId_locationStatus_idx"
ON "Visit"("storeId", "locationStatus");

ALTER TABLE "LocationCaptureException"
ADD CONSTRAINT "LocationCaptureException_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LocationCaptureException"
ADD CONSTRAINT "LocationCaptureException_staffId_fkey"
FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
