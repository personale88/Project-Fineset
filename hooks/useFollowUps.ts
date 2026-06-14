import { useQuery } from "@tanstack/react-query";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";
import type { FollowUpListItem } from "@/types";

interface FollowUpQuery {
  storeId?: string;
  status?: FollowUpListItem["status"];
  overdue?: boolean;
}

export function useFollowUps(params: FollowUpQuery = {}) {
  const qs = buildQueryString({
    storeId: params.storeId,
    status: params.status,
    overdue: params.overdue ? "true" : undefined,
  });

  return useQuery({
    queryKey: ["follow-ups", params],
    queryFn: () => apiFetch<FollowUpListItem[]>(`/api/follow-ups${qs}`),
    ...LIVE_QUERY_OPTIONS,
  });
}
