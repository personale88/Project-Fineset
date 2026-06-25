import { z } from "zod";

export const reviewBillingPaymentSubmissionSchema = z.object({
  status: z.enum(["RECEIVED", "NOT_RECEIVED"]),
});

export const listBillingPaymentSubmissionsQuerySchema = z.object({
  status: z.enum(["PENDING", "RECEIVED", "NOT_RECEIVED", "ALL"]).optional(),
});
