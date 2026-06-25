-- CreateEnum
CREATE TYPE "BillingPaymentSubmissionStatus" AS ENUM ('PENDING', 'RECEIVED', 'NOT_RECEIVED');

-- CreateTable
CREATE TABLE "BillingPaymentSubmission" (
    "id" TEXT NOT NULL,
    "businessKey" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessEmail" TEXT,
    "invoiceNumber" TEXT,
    "amountInr" INTEGER NOT NULL,
    "upiVpa" TEXT,
    "submittedByEmail" TEXT,
    "submittedByName" TEXT,
    "status" "BillingPaymentSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPaymentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingPaymentSubmission_status_createdAt_idx" ON "BillingPaymentSubmission"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BillingPaymentSubmission_businessKey_createdAt_idx" ON "BillingPaymentSubmission"("businessKey", "createdAt" DESC);
