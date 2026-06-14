import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getStaffCallFilters,
  getStaffCalls,
  revealStaffCallPhone,
  submitManualStaffCall,
  submitStaffCallOutcome,
  type StaffCallRecordRef,
} from "@/lib/api/staff-calls";
import { staffCallsParamsMatch } from "@/lib/query/initial-data";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import {
  LIVE_QUERY_OPTIONS,
  STAFF_FILTER_QUERY_OPTIONS,
  queryOptionsForHydration,
} from "@/lib/sync/constants";
import type { GetStaffCallsParams, StaffCallListResponse } from "@/types";
import type { StaffCallOutcomeInput } from "@/lib/validations/staff-calls.schema";
import type { ManualStaffCallInput } from "@/lib/validations/staff-calls.schema";

interface UseStaffCallsOptions {
  initialData?: StaffCallListResponse;
  initialParams?: GetStaffCallsParams;
}

function staffCallFilterParams(params: GetStaffCallsParams): GetStaffCallsParams {
  const { page: _page, pageSize: _pageSize, ...rest } = params;
  return rest;
}

export function useStaffCallFilterCounts(params: GetStaffCallsParams) {
  const filterParams = staffCallFilterParams(params);

  return useQuery({
    queryKey: ["staff-calls-filters", filterParams],
    queryFn: () => getStaffCallFilters(filterParams),
    ...STAFF_FILTER_QUERY_OPTIONS,
  });
}

export function useStaffCalls(params: GetStaffCallsParams, options?: UseStaffCallsOptions) {
  const useInitialData =
    options?.initialData &&
    options.initialParams &&
    staffCallsParamsMatch(params, options.initialParams);

  return useQuery({
    queryKey: ["staff-calls", params],
    queryFn: () => getStaffCalls(params),
    initialData: useInitialData ? options.initialData : undefined,
    ...LIVE_QUERY_OPTIONS,
    ...queryOptionsForHydration(Boolean(useInitialData)),
  });
}

export function useRevealStaffCallPhone() {
  return useMutation({
    mutationFn: (ref: StaffCallRecordRef) => revealStaffCallPhone(ref),
  });
}

export function useSubmitStaffCallOutcome() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ref,
      payload,
    }: {
      ref: StaffCallRecordRef;
      payload: StaffCallOutcomeInput;
    }) => submitStaffCallOutcome(ref, payload),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useSubmitManualStaffCall(storeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ManualStaffCallInput) =>
      submitManualStaffCall(payload, storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}
