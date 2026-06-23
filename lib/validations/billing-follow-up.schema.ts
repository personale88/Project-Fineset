import { z } from "zod";

const businessKeySchema = z.string().trim().min(1).max(320);

export const billingPaymentStatusSchema = z.enum([
  "UNPAID",
  "PAID",
  "PARTIAL",
  "WAIVED",
  "DISPUTED",
]);

export const billingFollowUpChannelSchema = z.enum([
  "EMAIL",
  "PHONE",
  "WHATSAPP",
  "IN_PERSON",
  "OTHER",
]);

export const billingFollowUpOutcomeSchema = z.enum([
  "NO_RESPONSE",
  "PROMISED_PAYMENT",
  "PARTIAL_PAYMENT",
  "PAID",
  "DISPUTED",
  "RESCHEDULED",
  "OTHER",
]);

export const billingAccountQuerySchema = z.object({
  businessKey: businessKeySchema,
});

export const createBillingFollowUpSchema = z.object({
  businessKey: businessKeySchema,
  channel: billingFollowUpChannelSchema,
  outcome: billingFollowUpOutcomeSchema,
  notes: z.string().trim().min(1).max(2000),
  nextFollowUpAt: z.string().datetime().optional().nullable(),
});

export const updateBillingAccountSchema = z.object({
  businessKey: businessKeySchema,
  paymentStatus: billingPaymentStatusSchema,
  notes: z.string().trim().max(2000).optional(),
});

export type CreateBillingFollowUpInput = z.infer<typeof createBillingFollowUpSchema>;
export type UpdateBillingAccountInput = z.infer<typeof updateBillingAccountSchema>;
