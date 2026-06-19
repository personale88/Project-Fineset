import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listCorrectionRequests,
  resolveCorrectionRequest,
} from "@/lib/api/correction-requests";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useCorrectionRequests(storeId: string) {
  return useQuery({
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
    },
  });
}
