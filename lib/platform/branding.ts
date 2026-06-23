import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import type { PlatformSettings, PlatformSettingsGeneral } from "@/lib/platform/types";
import { getPlatformSettings } from "@/lib/services/platform-settings";

export type PlatformBranding = PlatformSettingsGeneral;

export function brandingFromSettings(settings: PlatformSettings): PlatformBranding {
  return settings.general;
}

export function brandingFromDefaults(): PlatformBranding {
  return DEFAULT_PLATFORM_SETTINGS.general;
}

export async function getPlatformBranding(): Promise<PlatformBranding> {
  const settings = await getPlatformSettings();
  return brandingFromSettings(settings);
}

export function billingFromName(branding: PlatformBranding): string {
  return `${branding.platformName} Billing`;
}
