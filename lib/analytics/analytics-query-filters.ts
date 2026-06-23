import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";

export const ANALYTICS_FILTER_NA = "NA" as const;

export const ANALYTICS_FILTER_KEYS = [
  "storeId",
  "city",
  "storeCategory",
  "staffId",
  "segment",
  "valueTier",
  "customerType",
  "intentTier",
  "purchaseStatus",
  "visitType",
  "sourceChannel",
  "gender",
  "ageGroup",
  "area",
  "budgetRange",
  "productCategory",
  "schemeProduct",
  "enrollmentOutcome",
  "schemeEnrolled",
] as const;

export type AnalyticsFilterKey = (typeof ANALYTICS_FILTER_KEYS)[number];

export function isAnalyticsFilterActive(
  query: AdminBusinessAnalyticsQuery,
  key: AnalyticsFilterKey,
): boolean {
  return query.activeFilters?.includes(key) ?? false;
}
