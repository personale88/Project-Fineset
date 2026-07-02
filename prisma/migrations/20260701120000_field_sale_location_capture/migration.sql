-- CreateEnum
CREATE TYPE "LocationCaptureStatus" AS ENUM ('DETECTED', 'PERMISSION_DENIED', 'UNAVAILABLE', 'POOR_ACCURACY', 'EXEMPT');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION,
ADD COLUMN "geofenceRadiusMeters" INTEGER;

-- AlterTable
ALTER TABLE "FieldSale" ADD COLUMN "submissionLatitude" DOUBLE PRECISION,
ADD COLUMN "submissionLongitude" DOUBLE PRECISION,
ADD COLUMN "locationAccuracyMeters" DOUBLE PRECISION,
ADD COLUMN "locationCapturedAt" TIMESTAMP(3),
ADD COLUMN "locationStatus" "LocationCaptureStatus",
ADD COLUMN "locationAddress" TEXT,
ADD COLUMN "submissionIp" TEXT,
ADD COLUMN "submissionUserAgent" TEXT,
ADD COLUMN "distanceFromStoreMeters" DOUBLE PRECISION,
ADD COLUMN "outsideApprovedArea" BOOLEAN;
