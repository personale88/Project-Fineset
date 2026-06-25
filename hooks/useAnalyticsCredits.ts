import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAnalyticsCredits,
  fetchAnalyticsCreditRechargePreview,
  grantAnalyticsCredits,
  submitAnalyticsCreditRecharge,
  type AnalyticsCreditsSnapshot,
} from "@/lib/api/analytics-credits";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export const ANALYTICS_CREDITS_QUERY_KEY = ["analytics", "credits"] as const;

export function useAnalyticsCredits() {
  return useQuery({
    queryKey: ANALYTICS_CREDITS_QUERY_KEY,
    queryFn: fetchAnalyticsCredits,
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useRechargeAnalyticsCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (packId: string) => submitAnalyticsCreditRecharge(packId),
    onSuccess: (result) => {
      queryClient.setQueryData(ANALYTICS_CREDITS_QUERY_KEY, result.snapshot);
    },
  });
}

export function useAnalyticsCreditRechargePreview(packId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...ANALYTICS_CREDITS_QUERY_KEY, "recharge-preview", packId],
    queryFn: () => fetchAnalyticsCreditRechargePreview(packId!),
    enabled: enabled && Boolean(packId),
    staleTime: 0,
  });
}

export function useGrantAnalyticsCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { credits: number; description?: string }) =>
      grantAnalyticsCredits(input),
    onSuccess: (snapshot: AnalyticsCreditsSnapshot) => {
      queryClient.setQueryData(ANALYTICS_CREDITS_QUERY_KEY, snapshot);
    },
  });
}
