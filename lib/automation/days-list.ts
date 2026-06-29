import type { PlatformAutomationConfig } from "@/lib/automation/types";
import { normalizeTimeInput } from "@/lib/utils/time-input";
import { normalizeAutomationCountryCode } from "@/lib/automation/country-code";

export const AUTOMATION_DAYS_LIST_MAX_ITEMS = 10;
export const AUTOMATION_DAYS_LIST_MAX_DAY = 90;

export interface AutomationDaysListConstraints {
  min?: number;
  max?: number;
  maxItems?: number;
}

function resolveAutomationDaysListConstraints(
  constraints: AutomationDaysListConstraints = {},
): Required<AutomationDaysListConstraints> {
  return {
    min: constraints.min ?? 0,
    max: constraints.max ?? AUTOMATION_DAYS_LIST_MAX_DAY,
    maxItems: constraints.maxItems ?? AUTOMATION_DAYS_LIST_MAX_ITEMS,
  };
}

export function isValidAutomationDay(
  value: number,
  constraints: AutomationDaysListConstraints = {},
): boolean {
  const { min, max } = resolveAutomationDaysListConstraints(constraints);
  return Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max;
}

export function sanitizeAutomationDaysList(
  days: number[],
  constraints: AutomationDaysListConstraints = {},
): number[] {
  const { maxItems } = resolveAutomationDaysListConstraints(constraints);
  return days.filter((day) => isValidAutomationDay(day, constraints)).slice(0, maxItems);
}

export function parseAutomationDaysList(
  raw: string,
  constraints: AutomationDaysListConstraints = {},
): number[] {
  return sanitizeAutomationDaysList(
    raw
      .split(",")
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((value) => Number.isFinite(value)),
    constraints,
  );
}

export function formatAutomationDaysList(
  days: number[],
  constraints: AutomationDaysListConstraints = {},
): string {
  return sanitizeAutomationDaysList(days, constraints).join(", ");
}

export function normalizeAutomationDaysListInput(
  raw: string,
  constraints: AutomationDaysListConstraints = {},
): string {
  return formatAutomationDaysList(parseAutomationDaysList(raw, constraints), constraints);
}

export function sanitizeAutomationConfigSection<S extends keyof PlatformAutomationConfig>(
  section: S,
  sectionDraft: PlatformAutomationConfig[S],
): PlatformAutomationConfig[S] {
  switch (section) {
    case "paymentReminders": {
      const value = sectionDraft as PlatformAutomationConfig["paymentReminders"];
      return {
        ...value,
        reminderDaysBeforeDue: sanitizeAutomationDaysList(value.reminderDaysBeforeDue),
        reminderDaysAfterDue: sanitizeAutomationDaysList(value.reminderDaysAfterDue),
      } as PlatformAutomationConfig[S];
    }
    case "followUps": {
      const value = sectionDraft as PlatformAutomationConfig["followUps"];
      return {
        ...value,
        spacingDays: sanitizeAutomationDaysList(value.spacingDays, {
          min: 1,
          max: 30,
          maxItems: 20,
        }),
      } as PlatformAutomationConfig[S];
    }
    case "expiryRenewal": {
      const value = sectionDraft as PlatformAutomationConfig["expiryRenewal"];
      return {
        ...value,
        renewalReminderDaysBefore: sanitizeAutomationDaysList(value.renewalReminderDaysBefore),
        expiryWarningDaysBefore: sanitizeAutomationDaysList(value.expiryWarningDaysBefore),
      } as PlatformAutomationConfig[S];
    }
    case "whatsApp": {
      const value = sectionDraft as PlatformAutomationConfig["whatsApp"];
      const businessHoursStart =
        normalizeTimeInput(value.businessHoursStart) ?? value.businessHoursStart;
      const businessHoursEnd =
        normalizeTimeInput(value.businessHoursEnd) ?? value.businessHoursEnd;
      const defaultCountryCode =
        normalizeAutomationCountryCode(value.defaultCountryCode) ??
        value.defaultCountryCode;
      return {
        ...value,
        businessHoursStart,
        businessHoursEnd,
        defaultCountryCode,
      } as PlatformAutomationConfig[S];
    }
    default:
      return sectionDraft;
  }
}
