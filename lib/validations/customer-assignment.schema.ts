import { z } from "zod";

export const assignCustomerSchema = z
  .object({
    targetStaffId: z.string().cuid(),
    visitId: z.string().cuid().optional(),
    fieldSaleId: z.string().cuid().optional(),
    followUpId: z.string().cuid().optional(),
  })
  .refine(
    (data) => {
      const count = [data.visitId, data.fieldSaleId, data.followUpId].filter(Boolean).length;
      return count === 1;
    },
    { message: "Provide exactly one of visitId, fieldSaleId, or followUpId." },
  );

export type AssignCustomerInput = z.infer<typeof assignCustomerSchema>;
