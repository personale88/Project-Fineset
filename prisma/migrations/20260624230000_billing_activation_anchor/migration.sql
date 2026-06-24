-- Activation-based billing anchor (earliest store createdAt for the business)
ALTER TABLE "BillingBusinessAccount" ADD COLUMN "billingAnchorAt" TIMESTAMP(3);
