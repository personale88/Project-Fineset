import { z } from "zod";
import { phoneSchema } from "./common.schema";

export const staffAmendVisitSchema = z
  .object({
    customerName: z.string().min(1).max(100).optional(),
    customerPhone: phoneSchema.optional(),
    area: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    profession: z.string().max(100).optional(),
    staffNotes: z.string().max(500).optional(),
    followUpNeeded: z.boolean().optional(),
    followUpDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  })
  .superRefine((data, ctx) => {
    if (data.followUpNeeded && !data.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required when follow-up is needed",
        path: ["followUpDate"],
      });
    }
  });

export const staffAmendFieldSaleSchema = z
  .object({
    customerName: z.string().min(1).max(100).optional(),
    customerPhone: phoneSchema.optional(),
    area: z.string().max(100).optional(),
    locationLabel: z.string().max(200).optional(),
    staffNotes: z.string().max(500).optional(),
    followUpNeeded: z.boolean().optional(),
    followUpDate: z.coerce.date().optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field is required",
  })
  .superRefine((data, ctx) => {
    if (data.followUpNeeded && !data.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required when follow-up is needed",
        path: ["followUpDate"],
      });
    }
  });

export const staffCorrectionRequestSchema = z
  .object({
    visitId: z.string().optional(),
    fieldSaleId: z.string().optional(),
    message: z.string().min(10).max(500),
  })
  .refine((data) => Boolean(data.visitId || data.fieldSaleId), {
    message: "visitId or fieldSaleId is required",
  });

export type StaffAmendVisitInput = z.infer<typeof staffAmendVisitSchema>;
export type StaffAmendFieldSaleInput = z.infer<typeof staffAmendFieldSaleSchema>;
export type StaffCorrectionRequestInput = z.infer<typeof staffCorrectionRequestSchema>;
