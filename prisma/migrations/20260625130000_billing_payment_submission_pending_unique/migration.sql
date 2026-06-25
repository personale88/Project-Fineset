-- One pending payment submission per business (prevents duplicate portal submits).
CREATE UNIQUE INDEX "BillingPaymentSubmission_businessKey_pending_key"
ON "BillingPaymentSubmission" ("businessKey")
WHERE "status" = 'PENDING';
