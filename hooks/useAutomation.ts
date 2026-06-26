import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAutomationConfig,
  fetchAutomationRuns,
  runBillingAutomation,
  updateAutomationConfig,
} from "@/lib/api/automation";
import type { AutomationConfigPatchInput } from "@/lib/automation/config-schema";

export function useAutomationConfig() {
  return useQuery({
    queryKey: ["admin", "automation", "config"],
    queryFn: fetchAutomationConfig,
  });
}

export function useUpdateAutomationConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: AutomationConfigPatchInput) => updateAutomationConfig(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "automation", "config"], data);
    },
  });
}

export function useAutomationRuns(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["admin", "automation", "runs", page, pageSize],
    queryFn: () => fetchAutomationRuns(page, pageSize),
  });
}

export function useRunBillingAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: { dryRun?: boolean }) => runBillingAutomation(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "automation", "runs"] });
    },
  });
}
