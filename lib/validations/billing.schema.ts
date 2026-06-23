import { z } from "zod";

export const sendBusinessInvoiceSchema = z.object({
  businessKey: z.string().trim().min(1).max(320),
});

export const sendBillingWhatsAppReminderSchema = sendBusinessInvoiceSchema;

export type SendBusinessInvoiceInput = z.infer<typeof sendBusinessInvoiceSchema>;
