import type { AnalyticsAskBody } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";

export function applyAnalyticsScopeFilters(
  query: AdminBusinessAnalyticsQuery,
  body: Pick<AnalyticsAskBody, "storeId" | "city" | "storeCategory">,
): void {
  if (body.storeId) {
    query.storeId = body.storeId;
    query.activeFilters = [...new Set([...(query.activeFilters ?? []), "storeId"])];
    delete query.city;
    delete query.storeCategory;
    return;
  }

  if (body.city) {
    query.city = body.city;
    query.activeFilters = [...new Set([...(query.activeFilters ?? []), "city"])];
  }

  if (body.storeCategory) {
    query.storeCategory = body.storeCategory;
    query.activeFilters = [...new Set([...(query.activeFilters ?? []), "storeCategory"])];
  }
}

export function buildAnalyticsScopeDescription(
  appliedFilters: Array<{ key: string; label: string; value: string }>,
): string | null {
  const scopeFilters = appliedFilters.filter((filter) =>
    ["storeId", "city", "storeCategory"].includes(filter.key),
  );

  if (scopeFilters.length === 0) return null;

  return scopeFilters.map((filter) => `${filter.label}: ${filter.value}`).join(" · ");
}
