import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateFollowUp as updateFollowUpRequest } from "@/lib/api/follow-ups";
import { apiFetch, buildQueryString } from "@/lib/api/client";
import { invalidateEntities } from "@/lib/sync/invalidate-portal-data";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";
import type { UpdateFollowUpInput } from "@/lib/validations/follow-ups.schema";
import type { FollowUpListItem } from "@/types";

export type FollowUpFilter = "overdue" | "due_today" | "open" | "mismatched";

export interface FollowUpQuery {
  storeId?: string;
  status?: FollowUpListItem["status"];
  overdue?: boolean;
  dueToday?: boolean;
  filter?: FollowUpFilter;
  personalScope?: boolean;
  mismatched?: boolean;
}

interface UpdateFollowUpVariables {
  followUpId: string;
  payload: UpdateFollowUpInput;
  storeId?: string;
}

export function useFollowUps(params: FollowUpQuery = {}) {
  const qs = buildQueryString({
    storeId: params.storeId,
    status: params.status,
    overdue: params.overdue ? "true" : undefined,
    dueToday: params.dueToday ? "true" : undefined,
    filter: params.filter,
    personalScope: params.personalScope ? "true" : undefined,
    mismatched: params.mismatched ? "true" : undefined,
  });

  return useQuery({
    queryKey: ["follow-ups", params],
    queryFn: () => apiFetch<FollowUpListItem[]>(`/api/follow-ups${qs}`),
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useUpdateFollowUp(listParams: FollowUpQuery = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followUpId, payload, storeId }: UpdateFollowUpVariables) =>
      updateFollowUpRequest(followUpId, payload, storeId),
    onSuccess: async () => {
      await invalidateEntities(queryClient, ["followUps", "visits", "fieldSales", "callLogs"]);
      await queryClient.invalidateQueries({ queryKey: ["follow-ups", listParams] });
    },
  });
}
