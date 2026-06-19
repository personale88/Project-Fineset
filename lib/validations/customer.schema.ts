import { z } from "zod";

export const getCustomerProfileQuerySchema = z
  .object({
    customerId: z.string().optional(),
    visitId: z.string().optional(),
    fieldSaleId: z.string().optional(),
  })
  .refine((data) => data.customerId || data.visitId || data.fieldSaleId, {
    message: "customerId, visitId, or fieldSaleId is required",
  });
