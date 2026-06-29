import { formatAutomationRunRequestError } from "@/lib/automation/run-summary";

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/** Maps save/run failures to a clear offline message when the browser is offline. */
export function resolveAutomationActionError(
  error: unknown,
  offlineMessage: string,
): string | undefined {
  if (isBrowserOffline()) {
    return offlineMessage;
  }

  return formatAutomationRunRequestError(error);
}
