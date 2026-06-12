import type {
  GetAnalyticsParams,
  GetFieldSalesListParams,
  GetPortalCallsParams,
  GetStaffCallsParams,
  GetVisitsParams,
} from "@/types";

export function visitsParamsMatch(
  current: GetVisitsParams,
  initial: GetVisitsParams,
): boolean {
  return (
    (current.page ?? "1") === (initial.page ?? "1") &&
    (current.pageSize ?? "20") === (initial.pageSize ?? "20") &&
    (current.search ?? "") === (initial.search ?? "") &&
    (current.startDate ?? "") === (initial.startDate ?? "") &&
    (current.endDate ?? "") === (initial.endDate ?? "") &&
    (current.followUpOnly ?? "") === (initial.followUpOnly ?? "") &&
    (current.sortBy ?? "") === (initial.sortBy ?? "") &&
    (current.sortOrder ?? "desc") === (initial.sortOrder ?? "desc") &&
    (current.staffId ?? "") === (initial.staffId ?? "") &&
    (current.purchaseStatus ?? "") === (initial.purchaseStatus ?? "") &&
    (current.visitType ?? "") === (initial.visitType ?? "") &&
    (current.customerType ?? "") === (initial.customerType ?? "") &&
    (current.sourceChannel ?? "") === (initial.sourceChannel ?? "") &&
    (current.storeId ?? "") === (initial.storeId ?? "")
  );
}

export function fieldSalesParamsMatch(
  current: GetFieldSalesListParams,
  initial: GetFieldSalesListParams,
): boolean {
  return (
    (current.page ?? 1) === (initial.page ?? 1) &&
    (current.pageSize ?? 15) === (initial.pageSize ?? 15) &&
    (current.year ?? new Date().getFullYear()) ===
      (initial.year ?? new Date().getFullYear()) &&
    (current.month ?? new Date().getMonth() + 1) ===
      (initial.month ?? new Date().getMonth() + 1) &&
    (current.search ?? "") === (initial.search ?? "") &&
    (current.storeId ?? "") === (initial.storeId ?? "") &&
    (current.staffId ?? "") === (initial.staffId ?? "") &&
    (current.enrollmentOutcome ?? "") === (initial.enrollmentOutcome ?? "") &&
    (current.activityType ?? "") === (initial.activityType ?? "")
  );
}

export function portalCallsParamsMatch(
  current: GetPortalCallsParams,
  initial: GetPortalCallsParams,
): boolean {
  return (
    (current.page ?? 1) === (initial.page ?? 1) &&
    (current.pageSize ?? 15) === (initial.pageSize ?? 15) &&
    (current.year ?? new Date().getFullYear()) ===
      (initial.year ?? new Date().getFullYear()) &&
    (current.month ?? new Date().getMonth() + 1) ===
      (initial.month ?? new Date().getMonth() + 1) &&
    (current.segment ?? "ALL") === (initial.segment ?? "ALL") &&
    (current.valueTier ?? "ALL") === (initial.valueTier ?? "ALL") &&
    (current.queue ?? "ALL") === (initial.queue ?? "ALL") &&
    (current.search ?? "") === (initial.search ?? "") &&
    (current.storeId ?? "") === (initial.storeId ?? "") &&
    (current.staffId ?? "") === (initial.staffId ?? "") &&
    (current.intentTier ?? "") === (initial.intentTier ?? "")
  );
}

export function defaultFieldSalesParams(storeId?: string): GetFieldSalesListParams {
  const now = new Date();
  return {
    page: 1,
    pageSize: 15,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    storeId,
  };
}

export function defaultPortalCallsParams(storeId?: string): GetPortalCallsParams {
  const now = new Date();
  return {
    page: 1,
    pageSize: 15,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    segment: "ALL",
    valueTier: "ALL",
    queue: "ALL",
    storeId,
  };
}

export const DEFAULT_VISITS_PARAMS: GetVisitsParams = {
  page: "1",
  pageSize: "20",
  sortBy: "visitDate",
  sortOrder: "desc",
};

export const DEFAULT_ANALYTICS_PARAMS: GetAnalyticsParams = {
  period: "today",
};

export const DEFAULT_STORES_PARAMS = {
  page: 1,
  pageSize: 50,
} as const;

export const DEFAULT_STORES_FILTER_PARAMS = {
  page: 1,
  pageSize: 100,
} as const;

export function analyticsParamsMatch(
  current: GetAnalyticsParams,
  initial: GetAnalyticsParams,
): boolean {
  return (
    (current.period ?? "today") === (initial.period ?? "today") &&
    (current.storeId ?? "") === (initial.storeId ?? "")
  );
}

export function storesParamsMatch(
  current: { page?: number; pageSize?: number; search?: string },
  initial: { page?: number; pageSize?: number; search?: string },
): boolean {
  return (
    (current.page ?? 1) === (initial.page ?? 1) &&
    (current.pageSize ?? 50) === (initial.pageSize ?? 50) &&
    (current.search ?? "") === (initial.search ?? "")
  );
}

export function staffPerformanceStoreFilterMatch(
  current: string,
  initial: string,
): boolean {
  return current === initial;
}

export function staffCallsParamsMatch(
  current: GetStaffCallsParams,
  initial: GetStaffCallsParams,
): boolean {
  return (
    (current.storeId ?? "") === (initial.storeId ?? "") &&
    (current.page ?? 1) === (initial.page ?? 1) &&
    (current.pageSize ?? 15) === (initial.pageSize ?? 15) &&
    (current.year ?? new Date().getFullYear()) ===
      (initial.year ?? new Date().getFullYear()) &&
    (current.month ?? new Date().getMonth() + 1) ===
      (initial.month ?? new Date().getMonth() + 1) &&
    (current.segment ?? "ALL") === (initial.segment ?? "ALL") &&
    (current.valueTier ?? "ALL") === (initial.valueTier ?? "ALL") &&
    (current.queue ?? "ALL") === (initial.queue ?? "ALL") &&
    (current.master ?? "ALL") === (initial.master ?? "ALL") &&
    (current.birthday ?? "ALL") === (initial.birthday ?? "ALL") &&
    (current.anniversary ?? "ALL") === (initial.anniversary ?? "ALL")
  );
}

export function defaultStaffCallsParams(): GetStaffCallsParams {
  const now = new Date();
  return {
    page: 1,
    pageSize: 15,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    segment: "ALL",
    valueTier: "ALL",
    queue: "ALL",
    master: "ALL",
    birthday: "ALL",
    anniversary: "ALL",
  };
}
