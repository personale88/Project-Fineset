import { z } from "zod";

export const staffCallSegmentSchema = z.enum([
  "ALL",
  "NEW",
  "RETAINED",
  "PURCHASED",
  "NOT_PURCHASED",
]);

export const staffCallValueTierSchema = z.enum(["ALL", "HIGH", "MID", "LOW"]);

export const staffCallQueueSchema = z.enum(["ALL", "RETENTION", "FOLLOW_UP", "NOT_ANSWERED"]);

export const staffCallOccasionFilterSchema = z.enum(["ALL", "THIS_MONTH"]);

export const staffCallMasterFilterSchema = z.enum([
  "ALL",
  "STORE_VISIT",
  "FIELD_SALE",
  "EXTERNAL",
]);

export const staffCallListQuerySchema = z.object({
  storeId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
  segment: staffCallSegmentSchema.default("ALL"),
  valueTier: staffCallValueTierSchema.default("ALL"),
  queue: staffCallQueueSchema.default("ALL"),
  master: staffCallMasterFilterSchema.default("ALL"),
  birthday: staffCallOccasionFilterSchema.default("ALL"),
  anniversary: staffCallOccasionFilterSchema.default("ALL"),
  year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2100)
    .default(() => new Date().getFullYear()),
  month: z.coerce
    .number()
    .int()
    .min(1)
    .max(12)
    .default(() => new Date().getMonth() + 1),
});

export const staffCallOutcomeSchema = z
  .object({
    answered: z.enum(["ANSWERED", "NOT_ANSWERED"]),
    feedback: z.string().max(500).optional(),
    scheduleFollowUp: z.boolean().default(false),
    followUpDate: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.answered === "ANSWERED" && data.scheduleFollowUp && !data.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required when scheduling a follow-up",
        path: ["followUpDate"],
      });
    }
  });

export type StaffCallListQuery = z.infer<typeof staffCallListQuerySchema>;
export type StaffCallOutcomeInput = z.infer<typeof staffCallOutcomeSchema>;
