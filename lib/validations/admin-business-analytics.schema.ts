import { z } from "zod";
import { PRODUCT_CATEGORY_VALUES } from "@/lib/constants/product-categories";
import { adminAnalyticsPeriodSchema } from "@/lib/validations/admin-analytics-period.schema";
import {
  staffCallSegmentSchema,
  staffCallValueTierSchema,
} from "./staff-calls.schema";

const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.enum(values).optional();

const withNa = <T extends [string, ...string[]]>(values: T) =>
  optionalEnum([...values, "NA"] as unknown as [string, ...string[]]);

const activeFiltersSchema = z
  .string()
  .optional()
  .transform((value) => {
    if (!value?.trim()) return [] as string[];
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  });

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2000).max(2100);

const adminBusinessAnalyticsBaseSchema = z.object({
  dateMode: z.enum(["preset", "range", "day", "month", "compare"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  period: adminAnalyticsPeriodSchema.optional(),
  month: monthSchema.optional(),
  year: yearSchema.optional(),
  compareAMonth: monthSchema.optional(),
  compareAYear: yearSchema.optional(),
  compareBMonth: monthSchema.optional(),
  compareBYear: yearSchema.optional(),
  activeFilters: activeFiltersSchema,
  storeId: z.string().min(1).optional(),
  city: z.string().min(1).max(100).optional(),
  storeCategory: z.enum(["JEWELRY", "HANDBAGS", "WATCHES", "OTHER"]).optional(),
  staffId: z.string().min(1).optional(),
  segment: staffCallSegmentSchema.default("ALL"),
  valueTier: staffCallValueTierSchema.default("ALL"),
  customerType: optionalEnum(["NEW", "REPEAT", "VIP"]),
  intentTier: withNa(["HOT", "WARM", "COLD", "BROWSING"]),
  purchaseStatus: optionalEnum(["PURCHASED", "NOT_PURCHASED", "PENDING"]),
  visitType: optionalEnum(["WALK_IN", "APPOINTMENT"]),
  sourceChannel: optionalEnum([
    "ORGANIC_WALK_IN",
    "REFERRAL",
    "SOCIAL_MEDIA",
    "INTERNET",
    "PHONE",
    "USER_CALLS",
    "TANISHQ_REF",
    "CARATLANE_REF",
    "OTHER",
  ]),
  gender: withNa(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  ageGroup: withNa(["18-25", "26-35", "36-50", "50+"]),
  area: z.union([z.string().min(1).max(100), z.literal("NA")]).optional(),
  budgetRange: withNa([
    "UNDER_15K",
    "K15_50K",
    "K50_1L",
    "ABOVE_1L",
    "NOT_STATED",
  ]),
  productCategory: optionalEnum([...PRODUCT_CATEGORY_VALUES]),
  schemeProduct: optionalEnum(["GHS", "GPP", "NONE"]),
  enrollmentOutcome: withNa([
    "ENROLLED_GHS",
    "ENROLLED_GPP",
    "ENROLLED_BOTH",
    "INTERESTED",
    "DECLINED",
    "CALLBACK",
  ]),
  schemeEnrolled: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  schemeEnrolledNa: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const adminBusinessAnalyticsQuerySchema = adminBusinessAnalyticsBaseSchema
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate <= data.endDate;
      }
      return true;
    },
    { message: "startDate must be before or equal to endDate" },
  )
  .refine(
    (data) => {
      const mode = data.dateMode ?? "preset";
      if (mode === "month") return Boolean(data.month && data.year);
      return true;
    },
    { message: "month and year are required for month mode" },
  )
  .refine(
    (data) => {
      const mode = data.dateMode ?? "preset";
      if (mode === "day") return Boolean(data.startDate);
      return true;
    },
    { message: "startDate is required for day mode" },
  )
  .refine(
    (data) => {
      const mode = data.dateMode ?? "preset";
      if (mode === "range") return Boolean(data.startDate && data.endDate);
      return true;
    },
    { message: "startDate and endDate are required for range mode" },
  )
  .refine(
    (data) => {
      const mode = data.dateMode ?? "preset";
      if (mode !== "compare") return true;
      return (
        Boolean(data.compareAMonth && data.compareAYear) &&
        Boolean(data.compareBMonth && data.compareBYear)
      );
    },
    { message: "Both comparison periods require month and year" },
  );

export type AdminBusinessAnalyticsQuery = z.infer<
  typeof adminBusinessAnalyticsQuerySchema
>;
