import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { AutomationConfigPatchInput } from "@/lib/automation/config-schema";
import type {
  AutomationRunLogDto,
  PlatformAutomationConfig,
} from "@/lib/automation/types";

export async function fetchAutomationConfig(): Promise<PlatformAutomationConfig> {
  return apiFetch<PlatformAutomationConfig>("/api/admin/automation/config");
}

export async function updateAutomationConfig(
  patch: AutomationConfigPatchInput,
): Promise<PlatformAutomationConfig> {
  return apiFetch<PlatformAutomationConfig>("/api/admin/automation/config", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function fetchAutomationRuns(
  page = 1,
  pageSize = 20,
): Promise<{ runs: AutomationRunLogDto[]; total: number }> {
  const query = buildQueryString({ page, pageSize });
  return apiFetch<{ runs: AutomationRunLogDto[]; total: number }>(
    `/api/admin/automation/runs${query}`,
  );
}

export async function runBillingAutomation(input?: {
  dryRun?: boolean;
}): Promise<AutomationRunLogDto> {
  return apiFetch<AutomationRunLogDto>("/api/admin/automation/run", {
    method: "POST",
    body: JSON.stringify(input ?? {}),
  });
}
