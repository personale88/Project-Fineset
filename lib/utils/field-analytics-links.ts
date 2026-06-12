import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";

export interface FieldLogLinkFilters {
  year?: number;
  month?: number;
  staffId?: string;
  enrollmentOutcome?: FieldEnrollmentOutcomeFilter;
  activityType?: FieldActivityTypeFilter;
  search?: string;
  storeId?: string;
}

export type FieldActivityTypeFilter =
  | "DOOR_TO_DOOR"
  | "HOUSING_SOCIETY"
  | "CORPORATE"
  | "EVENT_EXHIBITION"
  | "MARKET_STALL"
  | "REFERRAL_MEET"
  | "OTHER";

export type FieldEnrollmentOutcomeFilter =
  | "ENROLLED_GHS"
  | "ENROLLED_GPP"
  | "ENROLLED_BOTH"
  | "INTERESTED"
  | "DECLINED"
  | "CALLBACK";

const ACTIVITY_TYPE_MAP: Record<string, FieldActivityTypeFilter> = {
  "Door to door": "DOOR_TO_DOOR",
  "Housing society": "HOUSING_SOCIETY",
  Corporate: "CORPORATE",
  "Event / exhibition": "EVENT_EXHIBITION",
  "Market stall": "MARKET_STALL",
  "Referral meet": "REFERRAL_MEET",
  Other: "OTHER",
};

const OUTCOME_MAP: Record<string, FieldEnrollmentOutcomeFilter> = {
  "Enrolled GHS": "ENROLLED_GHS",
  "Enrolled JPP": "ENROLLED_GPP",
  "Enrolled both": "ENROLLED_BOTH",
  Interested: "INTERESTED",
  Declined: "DECLINED",
  Callback: "CALLBACK",
};

export function periodRangeToFieldLogMonth(range: {
  start: string;
  end: string;
}): { year: number; month: number } {
  const end = new Date(range.end);
  return {
    year: end.getFullYear(),
    month: end.getMonth() + 1,
  };
}

export function activityTypeFromLabel(label: string): FieldActivityTypeFilter | undefined {
  return ACTIVITY_TYPE_MAP[label];
}

export function enrollmentOutcomeFromLabel(
  label: string,
): FieldEnrollmentOutcomeFilter | undefined {
  return OUTCOME_MAP[label];
}

export function buildStoreFieldSalesLogHref(
  filters: FieldLogLinkFilters,
  dashboardBase = BUSINESS_OWNER_DASHBOARD_PATH,
): string {
  const params = new URLSearchParams();

  if (filters.year != null) params.set("year", String(filters.year));
  if (filters.month != null) params.set("month", String(filters.month));
  if (filters.staffId) params.set("staffId", filters.staffId);
  if (filters.enrollmentOutcome) params.set("enrollmentOutcome", filters.enrollmentOutcome);
  if (filters.activityType) params.set("activityType", filters.activityType);
  if (filters.search) params.set("search", filters.search);
  if (filters.storeId) params.set("storeId", filters.storeId);

  const qs = params.toString();
  return `${dashboardBase}/field-sales${qs ? `?${qs}` : ""}`;
}
