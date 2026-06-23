import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAnalyticsCredits,
  grantAnalyticsCredits,
  rechargeAnalyticsCredits,
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
    mutationFn: (packId: string) => rechargeAnalyticsCredits(packId),
    onSuccess: (snapshot: AnalyticsCreditsSnapshot) => {
      queryClient.setQueryData(ANALYTICS_CREDITS_QUERY_KEY, snapshot);
    },
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
