import type { PlatformAutomationConfig } from "@/lib/automation/types";
import type { AutomationRunTrigger } from "@prisma/client";

export class AutomationRunBlockedError extends Error {
  constructor(
    message = "Automations are disabled. Enable automations or use preview run.",
  ) {
    super(message);
    this.name = "AutomationRunBlockedError";
  }
}

export function assertManualAutomationRunAllowed(
  config: PlatformAutomationConfig,
  input: { trigger: AutomationRunTrigger; dryRun?: boolean },
): void {
  if (config.global.enabled) return;
  if (input.dryRun === true) return;
  if (input.trigger !== "MANUAL") return;
  throw new AutomationRunBlockedError();
}

/** Whether the Overview Run Now button should be enabled in the admin UI. */
export function isAutomationLiveRunAllowedInUi(
  draft: PlatformAutomationConfig,
  persisted: PlatformAutomationConfig | undefined,
): boolean {
  if (!draft.global.enabled) return false;
  if (persisted !== undefined && !persisted.global.enabled) return false;
  return true;
}
