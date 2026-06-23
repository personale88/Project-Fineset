import type { PlatformSettingsOnboarding } from "@/lib/platform/types";

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function computeOnboardingDefaultDates(
  onboarding: PlatformSettingsOnboarding,
  reference = new Date(),
): { dataExpiryAt: string; renewalDueAt: string } {
  return {
    dataExpiryAt: toDateInputValue(addMonths(reference, onboarding.defaultDataExpiryMonths)),
    renewalDueAt: toDateInputValue(addMonths(reference, onboarding.defaultRenewalMonths)),
  };
}
