import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";

export function normalizeAutomationTimezone(timezone: string): string {
  return timezone.trim();
}

export function resolvePlatformDefaultTimezone(platformTimezone?: string | null): string {
  const normalized = platformTimezone ? normalizeAutomationTimezone(platformTimezone) : "";
  return normalized || DEFAULT_PLATFORM_AUTOMATION_CONFIG.global.timezone;
}

export function hasAutomationTimezoneDrift(
  automationTimezone: string,
  platformTimezone: string,
): boolean {
  return (
    normalizeAutomationTimezone(automationTimezone) !==
    normalizeAutomationTimezone(platformTimezone)
  );
}

export function formatAutomationTimezoneHint(
  template: string,
  platformTimezone: string,
): string {
  return template.replace("{platformTimezone}", platformTimezone);
}

export function formatAutomationTimezoneDriftMessage(
  template: string,
  automationTimezone: string,
  platformTimezone: string,
): string {
  return template
    .replace("{automationTimezone}", automationTimezone)
    .replace("{platformTimezone}", platformTimezone);
}
