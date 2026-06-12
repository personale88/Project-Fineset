import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import type {
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";
import type { IntentTier } from "@prisma/client";

export interface CallLogLinkFilters {
  year?: number;
  month?: number;
  segment?: StaffCallSegment;
  valueTier?: StaffCallValueTier;
  staffId?: string;
  intentTier?: IntentTier;
  storeId?: string;
}

const CUSTOMER_TYPE_SEGMENT: Record<string, StaffCallSegment> = {
  New: "NEW",
  Repeat: "RETAINED",
  VIP: "RETAINED",
};

const PURCHASE_STATUS_SEGMENT: Record<string, StaffCallSegment> = {
  Purchased: "PURCHASED",
  "Not purchased": "NOT_PURCHASED",
};

const VALUE_TIER_FILTER: Record<string, StaffCallValueTier> = {
  "High value": "HIGH",
  "Mid value": "MID",
  "Low value": "LOW",
};

const INTENT_TIER_FILTER: Record<string, IntentTier> = {
  "Hot intent": "HOT",
  "Warm intent": "WARM",
  "Cold intent": "COLD",
  Browsing: "BROWSING",
};

export function periodRangeToCallLogMonth(range: {
  start: string;
  end: string;
}): { year: number; month: number } {
  const end = new Date(range.end);
  return {
    year: end.getFullYear(),
    month: end.getMonth() + 1,
  };
}

export function segmentFromCustomerTypeLabel(label: string): StaffCallSegment | undefined {
  return CUSTOMER_TYPE_SEGMENT[label];
}

export function segmentFromPurchaseStatusLabel(label: string): StaffCallSegment | undefined {
  return PURCHASE_STATUS_SEGMENT[label];
}

export function valueTierFromLabel(label: string): StaffCallValueTier | undefined {
  return VALUE_TIER_FILTER[label];
}

export function intentTierFromLabel(label: string): IntentTier | undefined {
  return INTENT_TIER_FILTER[label];
}

export function buildStoreCallsLogHref(
  filters: CallLogLinkFilters,
  dashboardBase = BUSINESS_OWNER_DASHBOARD_PATH,
): string {
  const params = new URLSearchParams();

  if (filters.year != null) params.set("year", String(filters.year));
  if (filters.month != null) params.set("month", String(filters.month));
  if (filters.segment && filters.segment !== "ALL") params.set("segment", filters.segment);
  if (filters.valueTier && filters.valueTier !== "ALL") {
    params.set("valueTier", filters.valueTier);
  }
  if (filters.staffId) params.set("staffId", filters.staffId);
  if (filters.intentTier) params.set("intentTier", filters.intentTier);
  if (filters.storeId) params.set("storeId", filters.storeId);

  const qs = params.toString();
  return `${dashboardBase}/calls${qs ? `?${qs}` : ""}`;
}

export function mergeCallLogFilters(
  base: CallLogLinkFilters,
  extra: CallLogLinkFilters,
): CallLogLinkFilters {
  return { ...base, ...extra };
}
