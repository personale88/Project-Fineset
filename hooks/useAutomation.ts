import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAutomationConfig,
  fetchAutomationRuns,
  runBillingAutomation,
  updateAutomationConfig,
} from "@/lib/api/automation";
import type { AutomationConfigPatchInput } from "@/lib/automation/config-schema";
import {
  AUTOMATION_RUNS_QUERY_KEY,
  automationRunsQueryKey,
  getAutomationRunHistoryNextPageParam,
  prependAutomationRunToCache,
} from "@/lib/automation/runs-query";

const AUTOMATION_CONFIG_QUERY_KEY = ["admin", "automation", "config"] as const;

export { AUTOMATION_CONFIG_QUERY_KEY };

export function useAutomationConfig() {
  return useQuery({
    queryKey: AUTOMATION_CONFIG_QUERY_KEY,
    queryFn: fetchAutomationConfig,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

export function useUpdateAutomationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AutomationConfigPatchInput) => updateAutomationConfig(patch),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: AUTOMATION_CONFIG_QUERY_KEY });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(AUTOMATION_CONFIG_QUERY_KEY, data);
    },
  });
}

export function useAutomationRuns(page = 1, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: automationRunsQueryKey(page),
    queryFn: () => fetchAutomationRuns(page),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

export function useAutomationRunHistory(options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: AUTOMATION_RUNS_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchAutomationRuns(pageParam),
    initialPageParam: 1,
    getNextPageParam: getAutomationRunHistoryNextPageParam,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: options?.enabled ?? true,
  });
}

export function useRunBillingAutomation(page = 1) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { dryRun?: boolean }) => runBillingAutomation(input),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: AUTOMATION_RUNS_QUERY_KEY });
    },
    onSuccess: (run) => {
      prependAutomationRunToCache(queryClient, run, page);
    },
  });
}
