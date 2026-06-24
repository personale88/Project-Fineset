-- Consolidated outstanding billing: settlement through-period + invoice period metadata
ALTER TABLE "BillingBusinessAccount" ADD COLUMN "paidThroughPeriodEnd" TIMESTAMP(3);

ALTER TABLE "BillingInvoiceLog" ADD COLUMN "periodStart" TIMESTAMP(3);
ALTER TABLE "BillingInvoiceLog" ADD COLUMN "periodEnd" TIMESTAMP(3);
ALTER TABLE "BillingInvoiceLog" ADD COLUMN "unpaidPeriodCount" INTEGER;
ALTER TABLE "BillingInvoiceLog" ADD COLUMN "periodBreakdown" JSONB;
