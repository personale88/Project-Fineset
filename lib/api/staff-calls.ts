import { apiFetch, buildQueryString } from "@/lib/api/client";
import type {
  GetStaffCallsParams,
  StaffCallDialResult,
  StaffCallFilterCounts,
  StaffCallListResponse,
  StaffCallMasterSource,
  StaffCallOutcomeResult,
} from "@/types";
import type { StaffCallOutcomeInput } from "@/lib/validations/staff-calls.schema";

export interface StaffCallRecordRef {
  recordId: string;
  masterSource: StaffCallMasterSource;
  storeId?: string;
}

export async function getStaffCalls(
  params: GetStaffCallsParams = {},
): Promise<StaffCallListResponse> {
  const qs = buildQueryString(params);
  return apiFetch<StaffCallListResponse>(`/api/staff/calls${qs}`);
}

export async function getStaffCallFilters(
  params: GetStaffCallsParams = {},
): Promise<StaffCallFilterCounts> {
  const { page: _page, pageSize: _pageSize, ...filterParams } = params;
  const qs = buildQueryString(filterParams);
  return apiFetch<StaffCallFilterCounts>(`/api/staff/calls/filters${qs}`);
}

export async function revealStaffCallPhone(
  ref: StaffCallRecordRef,
): Promise<StaffCallDialResult> {
  const qs = buildQueryString({
    masterSource: ref.masterSource,
    storeId: ref.storeId,
  });
  return apiFetch<StaffCallDialResult>(`/api/staff/calls/${ref.recordId}${qs}`);
}

export async function submitStaffCallOutcome(
  ref: StaffCallRecordRef,
  payload: StaffCallOutcomeInput,
): Promise<StaffCallOutcomeResult> {
  const qs = buildQueryString({
    masterSource: ref.masterSource,
    storeId: ref.storeId,
  });
  return apiFetch<StaffCallOutcomeResult>(`/api/staff/calls/${ref.recordId}${qs}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
