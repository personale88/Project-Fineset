import { z } from "zod";
import { personalScopeQuerySchema } from "@/lib/validations/personal-scope.schema";
import { phoneSchema } from "./common.schema";
import {
  fieldDeclineReasonSchema,
  refineSchemeFields,
  schemeEnrollmentOutcomeSchema,
  schemeProductSchema,
} from "./scheme.schema";

const customerTypeSchema = z.enum(["NEW", "REPEAT", "VIP"]);
const intentTierSchema = z.enum(["HOT", "WARM", "COLD", "BROWSING"]);
const genderSchema = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const ageGroupSchema = z.enum(["18-25", "26-35", "36-50", "50+"]);
const fieldActivityTypeSchema = z.enum([
  "DOOR_TO_DOOR",
  "HOUSING_SOCIETY",
  "CORPORATE",
  "EVENT_EXHIBITION",
  "MARKET_STALL",
  "REFERRAL_MEET",
  "OTHER",
]);

export const createFieldSaleSchema = z
  .object({
    customerName: z.string().min(1).max(100),
    customerPhone: phoneSchema,
    customerType: customerTypeSchema,
    area: z.string().max(100).optional(),
    gender: genderSchema.optional(),
    ageGroup: ageGroupSchema.optional(),
    profession: z.string().max(100).optional(),
    activityType: fieldActivityTypeSchema,
    locationLabel: z.string().max(200).optional(),
    activityDate: z.coerce.date().optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    schemesPitched: z.array(schemeProductSchema).default([]),
    enrollmentOutcome: schemeEnrollmentOutcomeSchema.optional(),
    monthlyCommitment: z.coerce.number().positive().optional(),
    intentTier: intentTierSchema.optional(),
    reasonNoEnrollment: fieldDeclineReasonSchema.optional(),
    competitorMention: z.string().max(200).optional(),
    followUpNeeded: z.boolean().default(false),
    followUpDate: z.coerce.date().optional(),
    staffNotes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    refineSchemeFields(data, ctx);

    if (data.followUpNeeded && !data.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required when follow-up is needed",
        path: ["followUpDate"],
      });
    }

    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

export type CreateFieldSaleInput = z.infer<typeof createFieldSaleSchema>;

export const getFieldSalesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
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
  allTime: z.coerce.boolean().optional().default(false),
  storeId: z.string().optional(),
  staffId: z.string().optional(),
  search: z.string().optional(),
  personalScope: personalScopeQuerySchema,
  enrollmentOutcome: schemeEnrollmentOutcomeSchema.optional(),
  activityType: fieldActivityTypeSchema.optional(),
});

export type GetFieldSalesQuery = z.infer<typeof getFieldSalesQuerySchema>;

export {
  customerTypeSchema,
  fieldActivityTypeSchema,
  schemeProductSchema,
  schemeEnrollmentOutcomeSchema,
  fieldDeclineReasonSchema,
  intentTierSchema,
};
