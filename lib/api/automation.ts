import { apiFetch, buildQueryString } from "@/lib/api/client";
import type {
  AutomationConfigApiResponse,
  AutomationRunLogDto,
  AutomationRunResult,
} from "@/lib/automation/types";
import type { AutomationConfigPatchInput } from "@/lib/automation/config-schema";

export async function fetchAutomationConfig(): Promise<AutomationConfigApiResponse> {
  return apiFetch<AutomationConfigApiResponse>("/api/admin/automation/config");
}

export async function updateAutomationConfig(
  patch: AutomationConfigPatchInput,
): Promise<AutomationConfigApiResponse> {
  return apiFetch<AutomationConfigApiResponse>("/api/admin/automation/config", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function fetchAutomationRuns(
  page = 1,
  pageSize = 20,
): Promise<{ runs: AutomationRunLogDto[]; total: number; page: number; pageSize: number }> {
  const query = buildQueryString({ page, pageSize });
  return apiFetch<{ runs: AutomationRunLogDto[]; total: number; page: number; pageSize: number }>(
    `/api/admin/automation/runs${query}`,
  );
}

export async function runBillingAutomation(input?: {
  dryRun?: boolean;
}): Promise<AutomationRunResult> {
  return apiFetch<AutomationRunResult>("/api/admin/automation/run", {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}
