import type { AutomationRunLogDto, AutomationRunSummary } from "@/lib/automation/types";
import { formatAutomationRunErrorsForDisplay } from "@/lib/automation/run-errors-display";
import { formatZodFlattenDetails } from "@/lib/utils/api-error-message";
import { ApiError } from "@/types";

export function formatAutomationRunSummaryLine(
  template: string,
  summary: AutomationRunSummary,
): string {
  return template
    .replace("{invoices}", String(summary.invoicesSent))
    .replace("{reminders}", String(summary.paymentRemindersSent))
    .replace("{whatsapp}", String(summary.whatsAppQueued))
    .replace("{followUps}", String(summary.followUpsScheduled))
    .replace("{renewals}", String(summary.renewalRemindersSent))
    .replace("{expiry}", String(summary.expiryWarningsSent))
    .replace("{reports}", String(summary.monthlyReportsSent));
}

export function formatAutomationRunErrors(
  errors: string[] | null | undefined,
): string | undefined {
  return formatAutomationRunErrorsForDisplay(errors);
}

export function isAutomationDryRunForced(
  dryRunRequested: boolean,
  run: Pick<AutomationRunLogDto, "trigger">,
): boolean {
  return !dryRunRequested && run.trigger === "DRY_RUN";
}

export function formatAutomationRunToastDescription(
  summaryTemplate: string,
  run: Pick<AutomationRunLogDto, "status" | "summary" | "errors">,
  options?: { dryRunForcedHint?: string; whatsAppQueuedHint?: string },
): string {
  const summaryLine = formatAutomationRunSummaryLine(summaryTemplate, run.summary);
  const errorLine = formatAutomationRunErrors(run.errors);
  const hints = [options?.dryRunForcedHint, options?.whatsAppQueuedHint]
    .map((hint) => hint?.trim())
    .filter(Boolean);
  const prefix = hints.length ? `${hints.join(" ")} ` : "";

  if ((run.status === "FAILED" || run.status === "PARTIAL") && errorLine) {
    return `${prefix}${summaryLine} — ${errorLine}`;
  }

  return `${prefix}${summaryLine}`.trim();
}

export function resolveAutomationRunToastTitle(
  copy: {
    runFailed: string;
    runPartialSuccess: string;
    runDryRunForced: string;
    runDryRunSuccess: string;
    runSuccess: string;
  },
  run: Pick<AutomationRunLogDto, "status" | "trigger">,
  dryRunRequested: boolean,
): string {
  if (run.status === "FAILED") return copy.runFailed;
  if (run.status === "PARTIAL") return copy.runPartialSuccess;
  if (isAutomationDryRunForced(dryRunRequested, run)) return copy.runDryRunForced;

  const isDryRun = dryRunRequested || run.trigger === "DRY_RUN";
  return isDryRun ? copy.runDryRunSuccess : copy.runSuccess;
}

export function formatAutomationRunRequestError(error: unknown): string | undefined {
  if (error instanceof ApiError) {
    const validation = formatZodFlattenDetails(error.body.details);
    if (validation) return validation;

    const message = error.body.message?.trim();
    if (message && message !== "Request failed" && message !== "Validation failed") {
      return message;
    }

    const detail = error.body.detail?.trim();
    if (detail) return detail;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return undefined;
}
