-- Extend payment submissions for manual UPI analytics credit recharges.
CREATE TYPE "BillingPaymentSubmissionKind" AS ENUM ('SUBSCRIPTION', 'ANALYTICS_CREDITS');

ALTER TABLE "BillingPaymentSubmission"
ADD COLUMN "kind" "BillingPaymentSubmissionKind" NOT NULL DEFAULT 'SUBSCRIPTION',
ADD COLUMN "appUserId" TEXT,
ADD COLUMN "packId" TEXT,
ADD COLUMN "creditAmount" INTEGER;

CREATE INDEX "BillingPaymentSubmission_kind_status_createdAt_idx"
ON "BillingPaymentSubmission" ("kind", "status", "createdAt" DESC);
