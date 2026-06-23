-- CreateEnum
CREATE TYPE "BillingPaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'WAIVED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "BillingFollowUpChannel" AS ENUM ('EMAIL', 'PHONE', 'WHATSAPP', 'IN_PERSON', 'OTHER');

-- CreateEnum
CREATE TYPE "BillingFollowUpOutcome" AS ENUM ('NO_RESPONSE', 'PROMISED_PAYMENT', 'PARTIAL_PAYMENT', 'PAID', 'DISPUTED', 'RESCHEDULED', 'OTHER');

-- CreateTable
CREATE TABLE "BillingBusinessAccount" (
    "id" TEXT NOT NULL,
    "businessKey" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessEmail" TEXT,
    "paymentStatus" "BillingPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "lastInvoiceNumber" TEXT,
    "lastInvoiceSentAt" TIMESTAMP(3),
    "lastFollowUpAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingBusinessAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoiceLog" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "sentTo" TEXT NOT NULL,
    "grandTotal" INTEGER NOT NULL,
    "sentByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoiceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingFollowUp" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "channel" "BillingFollowUpChannel" NOT NULL,
    "outcome" "BillingFollowUpOutcome" NOT NULL DEFAULT 'RESCHEDULED',
    "notes" VARCHAR(2000) NOT NULL,
    "nextFollowUpAt" TIMESTAMP(3),
    "createdByEmail" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingBusinessAccount_businessKey_key" ON "BillingBusinessAccount"("businessKey");

-- CreateIndex
CREATE INDEX "BillingBusinessAccount_paymentStatus_idx" ON "BillingBusinessAccount"("paymentStatus");

-- CreateIndex
CREATE INDEX "BillingBusinessAccount_nextFollowUpAt_idx" ON "BillingBusinessAccount"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "BillingInvoiceLog_accountId_createdAt_idx" ON "BillingInvoiceLog"("accountId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "BillingFollowUp_accountId_createdAt_idx" ON "BillingFollowUp"("accountId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "BillingInvoiceLog" ADD CONSTRAINT "BillingInvoiceLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BillingBusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingFollowUp" ADD CONSTRAINT "BillingFollowUp_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BillingBusinessAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
