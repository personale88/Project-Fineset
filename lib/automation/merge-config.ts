import type { PlatformAutomationConfig } from "@/lib/automation/types";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeSection<T extends Record<string, unknown>>(
  defaults: T,
  partial: unknown,
): T {
  if (!isPlainObject(partial)) return { ...defaults };
  const merged = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof T>) {
    const value = partial[key as string];
    if (value !== undefined) {
      merged[key] = value as T[keyof T];
    }
  }
  return merged;
}

export function mergeAutomationConfig(
  partial: unknown,
  base: PlatformAutomationConfig = DEFAULT_PLATFORM_AUTOMATION_CONFIG,
): PlatformAutomationConfig {
  if (!isPlainObject(partial)) {
    return structuredClone(base);
  }

  return {
    global: mergeSection(base.global, partial.global),
    billingCycle: mergeSection(base.billingCycle, partial.billingCycle),
    invoices: mergeSection(base.invoices, partial.invoices),
    paymentReminders: mergeSection(
      base.paymentReminders,
      partial.paymentReminders,
    ),
    followUps: mergeSection(base.followUps, partial.followUps),
    expiryRenewal: mergeSection(base.expiryRenewal, partial.expiryRenewal),
    monthlyReports: mergeSection(base.monthlyReports, partial.monthlyReports),
    whatsApp: mergeSection(base.whatsApp, partial.whatsApp),
  };
}

export function toBillingCycleSettings(config: PlatformAutomationConfig) {
  return {
    cycleStartDay: config.billingCycle.cycleStartDay,
    paymentDueDay: config.billingCycle.paymentDueDay,
    gracePeriodDays: config.billingCycle.gracePeriodDays,
  };
}
