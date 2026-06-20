import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCorrectionRequests,
  resolveCorrectionRequest,
  type CorrectionRequestItem,
} from "@/lib/api/correction-requests";
import { invalidateEntities } from "@/lib/sync/invalidate-portal-data";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useCorrectionRequests(storeId: string) {
  return useQuery<CorrectionRequestItem[]>({
    queryKey: ["correction-requests", storeId],
    queryFn: () => listCorrectionRequests(storeId),
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useResolveCorrectionRequest(storeId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => resolveCorrectionRequest(storeId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["correction-requests", storeId] });
      void queryClient.invalidateQueries({ queryKey: ["store-activity"] });
      void invalidateEntities(queryClient, ["visits", "followUps", "staff"]);
    },
  });
}
