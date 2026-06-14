import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { createVisit, getVisits, importVisitsCsv } from "@/lib/api/visits";
import { visitsParamsMatch } from "@/lib/query/initial-data";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import { LIVE_QUERY_OPTIONS, queryOptionsForHydration } from "@/lib/sync/constants";
import type { CreateVisitInput } from "@/lib/validations/visit.schema";
import type {
  GetVisitsParams,
  PaginatedResponse,
  VisitListItem,
} from "@/types";
import type { VisitsImportResult } from "@/lib/api/visits";

interface UseVisitsOptions {
  initialData?: PaginatedResponse<VisitListItem>;
  initialParams?: GetVisitsParams;
}

export function useVisits(params: GetVisitsParams = {}, options?: UseVisitsOptions) {
  const useInitialData =
    options?.initialData &&
    options.initialParams &&
    visitsParamsMatch(params, options.initialParams);

  return useQuery({
    queryKey: ["visits", params],
    queryFn: () => getVisits(params),
    initialData: useInitialData ? options.initialData : undefined,
    placeholderData: keepPreviousData,
    ...LIVE_QUERY_OPTIONS,
    ...queryOptionsForHydration(Boolean(useInitialData)),
  });
}

export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateVisitInput) => createVisit(payload),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useImportVisitsCsv(storeId?: string) {
  const queryClient = useQueryClient();

  return useMutation<VisitsImportResult, Error, File>({
    mutationFn: (file) => importVisitsCsv(file, storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}
