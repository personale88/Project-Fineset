import { getFieldSalesQuerySchema } from "@/lib/validations/field-sale.schema";
import type { FieldActivityTypeFilter } from "@/lib/utils/field-analytics-links";
import type { GetFieldSalesListParams } from "@/types";

const ACTIVITY_TYPES = new Set<FieldActivityTypeFilter>([
  "DOOR_TO_DOOR",
  "HOUSING_SOCIETY",
  "CORPORATE",
  "EVENT_EXHIBITION",
  "MARKET_STALL",
  "REFERRAL_MEET",
  "OTHER",
]);

export function parseFieldSalesSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): GetFieldSalesListParams {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") raw[key] = value;
  }

  const parsed = getFieldSalesQuerySchema.safeParse(raw);
  const base = parsed.success ? parsed.data : getFieldSalesQuerySchema.parse({});

  const activityTypeRaw = raw.activityType;
  const activityType =
    activityTypeRaw && ACTIVITY_TYPES.has(activityTypeRaw as FieldActivityTypeFilter)
      ? (activityTypeRaw as FieldActivityTypeFilter)
      : undefined;

  return {
    page: base.page,
    pageSize: base.pageSize,
    year: base.year,
    month: base.month,
    storeId: base.storeId,
    staffId: base.staffId,
    search: base.search,
    enrollmentOutcome: base.enrollmentOutcome,
    activityType,
    locationStatus: base.locationStatus,
    outsideApprovedArea: base.outsideApprovedArea,
  };
}
