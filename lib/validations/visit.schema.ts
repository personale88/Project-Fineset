import { z } from "zod";
import { PRODUCT_CATEGORY_VALUES } from "@/lib/constants/product-categories";
import { paginationQuerySchema, phoneSchema, sortOrderSchema } from "./common.schema";
import {
  fieldDeclineReasonSchema,
  refineSchemeFields,
  schemeEnrollmentOutcomeSchema,
  schemeProductSchema,
} from "./scheme.schema";

const customerTypeSchema = z.enum(["NEW", "REPEAT", "VIP"]);
const visitTypeSchema = z.enum(["WALK_IN", "APPOINTMENT"]);
const purchaseStatusSchema = z.enum(["PURCHASED", "NOT_PURCHASED"]);
const intentTierSchema = z.enum(["HOT", "WARM", "COLD", "BROWSING"]);
const budgetRangeSchema = z.enum([
  "UNDER_15K",
  "K15_50K",
  "K50_1L",
  "ABOVE_1L",
  "NOT_STATED",
]);
const sourceChannelSchema = z.enum([
  "ORGANIC_WALK_IN",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "INTERNET",
  "PHONE",
  "USER_CALLS",
  "TANISHQ_REF",
  "CARATLANE_REF",
  "USER_CALLS",
  "OTHER",
]);
const productCategorySchema = z.enum(PRODUCT_CATEGORY_VALUES);
const genderSchema = z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);
const ageGroupSchema = z.enum(["18-25", "26-35", "36-50", "50+"]);
const noPurchaseReasonSchema = z.enum([
  "BUDGET",
  "DESIGN_NOT_LIKED",
  "EXPLORING",
  "COMPETITOR",
  "PAYMENT_ISSUE",
  "WILL_VISIT_AGAIN",
]);
const purchaseOccasionSchema = z.enum([
  "WEDDING",
  "ANNIVERSARY",
  "GIFT",
  "SELF",
  "FESTIVAL",
]);
const metalKtPrefSchema = z.enum([
  "GOLD_14KT",
  "GOLD_18KT",
  "GOLD_22KT",
  "DIAMOND",
  "SILVER",
]);

function endOfToday(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

export const createVisitSchema = z
  .object({
    customerName: z.string().min(1).max(100),
    customerPhone: phoneSchema,
    customerType: customerTypeSchema,
    visitType: visitTypeSchema,
    visitDate: z.coerce
      .date()
      .optional()
      .refine((value) => !value || value <= endOfToday(), {
        message: "Sale date cannot be in the future",
      }),
    inTime: z.coerce.date().optional(),
    outTime: z.coerce.date().optional(),
    sourceChannel: sourceChannelSchema,
    area: z.string().max(100).optional(),
    address: z.string().max(300).optional(),
    profession: z.string().max(100).optional(),
    gender: genderSchema.optional(),
    ageGroup: ageGroupSchema.optional(),
    dateOfBirth: z.coerce
      .date()
      .optional()
      .refine((value) => !value || value <= new Date(), {
        message: "Date of birth cannot be in the future",
      }),
    anniversary: z.coerce
      .date()
      .optional()
      .refine((value) => !value || value <= new Date(), {
        message: "Anniversary cannot be in the future",
      }),
    productsExplored: z.array(productCategorySchema).default([]),
    purchaseStatus: purchaseStatusSchema.optional(),
    productsPurchased: z.array(productCategorySchema).default([]),
    transactionAmount: z.coerce.number().positive().optional(),
    intentTier: intentTierSchema.optional(),
    reasonNoPurchase: noPurchaseReasonSchema.optional(),
    competitorMention: z.string().max(200).optional(),
    purchaseOccasion: purchaseOccasionSchema.optional(),
    metalKtPref: metalKtPrefSchema.optional(),
    budgetStated: budgetRangeSchema.optional(),
    schemesPitched: z.array(schemeProductSchema).default([]),
    enrollmentOutcome: schemeEnrollmentOutcomeSchema.optional(),
    monthlyCommitment: z.coerce.number().positive().optional(),
    reasonNoEnrollment: fieldDeclineReasonSchema.optional(),
    schemeCompetitorMention: z.string().max(200).optional(),
    followUpNeeded: z.boolean().default(false),
    followUpDate: z.coerce.date().optional(),
    staffNotes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.purchaseStatus) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Purchase status is required",
        path: ["purchaseStatus"],
      });
      return;
    }

    if (data.purchaseStatus === "PURCHASED") {
      if (!data.transactionAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Transaction amount is required for purchases",
          path: ["transactionAmount"],
        });
      }
      if (data.productsPurchased.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one purchased product is required",
          path: ["productsPurchased"],
        });
      }
    }

    if (data.purchaseStatus === "NOT_PURCHASED" && data.productsExplored.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one explored product is required",
        path: ["productsExplored"],
      });
    }

    if (data.purchaseStatus === "NOT_PURCHASED" && !data.reasonNoPurchase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason is required when purchase was not made",
        path: ["reasonNoPurchase"],
      });
    }

    if (data.followUpNeeded && !data.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required when follow-up is needed",
        path: ["followUpDate"],
      });
    }

    if (data.inTime && data.outTime && data.outTime <= data.inTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Out time must be after in time",
        path: ["outTime"],
      });
    }

    refineSchemeFields(data, ctx);
  });

function optionalQueryEnum<T extends z.ZodType<string>>(schema: T) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
    schema.optional(),
  );
}

export const getVisitsQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  sortBy: z
    .enum(["visitDate", "transactionAmount", "customerName", "purchaseStatus"])
    .default("visitDate"),
  sortOrder: sortOrderSchema,
  storeId: z.string().optional(),
  followUpOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  staffId: z.preprocess(
    (v) => (typeof v === "string" && v.length === 0 ? undefined : v),
    z.string().optional(),
  ),
  purchaseStatus: optionalQueryEnum(purchaseStatusSchema),
  visitType: optionalQueryEnum(visitTypeSchema),
  customerType: optionalQueryEnum(customerTypeSchema),
  sourceChannel: optionalQueryEnum(sourceChannelSchema),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
export type GetVisitsQuery = z.infer<typeof getVisitsQuerySchema>;

export {
  customerTypeSchema,
  visitTypeSchema,
  purchaseStatusSchema,
  intentTierSchema,
  budgetRangeSchema,
  sourceChannelSchema,
  productCategorySchema,
};
