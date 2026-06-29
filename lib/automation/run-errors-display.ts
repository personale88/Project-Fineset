const SCOPED_AUTOMATION_RUN_ERROR = /^([^:]+):\s*([\s\S]+)$/;

/** Per-business automation errors are stored as "Business name: message". Hide identifiers in admin UI. */
export function sanitizeAutomationRunErrorForDisplay(error: string): string {
  const trimmed = error.trim();
  const match = trimmed.match(SCOPED_AUTOMATION_RUN_ERROR);
  if (!match) return trimmed;
  return match[2].trim();
}

export function automationRunErrorsWereRedacted(errors: string[] | null | undefined): boolean {
  return (errors ?? []).some((error) => SCOPED_AUTOMATION_RUN_ERROR.test(error.trim()));
}

export function getAutomationRunErrorMessagesForDisplay(
  errors: string[] | null | undefined,
): string[] {
  const messages = (errors ?? [])
    .map(sanitizeAutomationRunErrorForDisplay)
    .map((message) => message.trim())
    .filter(Boolean);

  return [...new Set(messages)];
}

export function formatAutomationRunErrorsForDisplay(
  errors: string[] | null | undefined,
): string | undefined {
  const uniqueMessages = getAutomationRunErrorMessagesForDisplay(errors);
  if (!uniqueMessages.length) return undefined;
  return uniqueMessages.join(" · ");
}

/** Keeps long run-history error text inside narrow layouts. */
export const AUTOMATION_RUN_ERROR_TEXT_CLASS =
  "min-w-0 break-words leading-relaxed [overflow-wrap:anywhere]";
