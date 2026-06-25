import { z } from "zod";
import { PRODUCT_CATEGORY_VALUES } from "@/lib/constants/product-categories";
import { COHORT_PIVOT_DIMENSIONS } from "@/lib/analytics/cohort-pivot";
import { adminAnalyticsPeriodSchema } from "@/lib/validations/admin-analytics-period.schema";

export const analyticsAskChartTypeSchema = z.enum([
  "line",
  "bar",
  "pie",
  "comparison",
  "radar",
]);

export const analyticsAskBodySchema = z.object({
  prompt: z.string().min(3).max(2000),
  storeId: z.string().min(1).optional(),
  city: z.string().min(1).max(100).optional(),
  storeCategory: z.enum(["JEWELRY", "HANDBAGS", "WATCHES", "OTHER"]).optional(),
  confirmLowConfidence: z.boolean().optional().default(false),
});

export type AnalyticsAskBody = z.infer<typeof analyticsAskBodySchema>;

export const analyticsAskIntentSchema = z.object({
  dateMode: z.enum(["preset", "range", "day", "month", "compare"]),
  period: adminAnalyticsPeriodSchema.optional(),
  month: z.number().int().min(1).max(12).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  compareAMonth: z.number().int().min(1).max(12).optional(),
  compareAYear: z.number().int().min(2000).max(2100).optional(),
  compareBMonth: z.number().int().min(1).max(12).optional(),
  compareBYear: z.number().int().min(2000).max(2100).optional(),
  /** Rolling calendar-month window, e.g. "last 10 months". */
  rollingMonths: z.number().int().min(1).max(24).optional(),
  /** Rolling day window, e.g. "last 45 days". */
  rollingDays: z.number().int().min(1).max(366).optional(),
  /** Optional hints when the user names a chart type; final charts are chosen from data. */
  chartTypes: z.array(analyticsAskChartTypeSchema).max(5).default([]),
  breakdownDimension: z.enum(COHORT_PIVOT_DIMENSIONS).optional(),
  activeFilters: z.array(z.string()).default([]),
  segment: z.enum(["ALL", "NEW", "RETAINED", "PURCHASED", "NOT_PURCHASED"]).optional(),
  valueTier: z.enum(["ALL", "HIGH", "MID", "LOW"]).optional(),
  customerType: z.enum(["NEW", "REPEAT", "VIP"]).optional(),
  productCategory: z.enum(PRODUCT_CATEGORY_VALUES).optional(),
  area: z.string().min(1).max(100).optional(),
});

export type ParsedAnalyticsAskIntent = z.infer<typeof analyticsAskIntentSchema>;
