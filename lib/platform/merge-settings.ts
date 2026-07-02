import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import type { PlatformSettings } from "@/lib/platform/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeSection<T extends object>(defaults: T, partial: unknown): T {
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

export function mergePlatformSettings(
  partial: unknown,
  base: PlatformSettings = DEFAULT_PLATFORM_SETTINGS,
): PlatformSettings {
  if (!isPlainObject(partial)) {
    return structuredClone(base);
  }

  return {
    general: mergeSection(base.general, partial.general),
    billing: mergeSection(base.billing, partial.billing),
    security: mergeSection(base.security, partial.security),
    analytics: mergeSection(base.analytics, partial.analytics),
    onboarding: mergeSection(base.onboarding, partial.onboarding),
    fieldForce: mergeSection(base.fieldForce, partial.fieldForce),
  };
}
