export const AUTOMATION_COUNTRY_CODE_RE = /^\d{1,4}$/;

export const AUTOMATION_COUNTRY_CODE_MESSAGE =
  "Enter 1 to 4 digits only, for example 91.";

export function isValidAutomationCountryCode(value: string): boolean {
  return AUTOMATION_COUNTRY_CODE_RE.test(value.trim());
}

export function normalizeAutomationCountryCode(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits || !AUTOMATION_COUNTRY_CODE_RE.test(digits)) return null;

  return digits;
}
