import { prisma } from "@/lib/db/prisma";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import { getPlatformIntegrationStatus } from "@/lib/platform/integration-status";
import { mergePlatformSettings } from "@/lib/platform/merge-settings";
import type { PlatformSettingsPatchInput } from "@/lib/platform/settings-schema";
import type {
  PlatformSettings,
  PlatformSettingsResponse,
} from "@/lib/platform/types";
import { invalidateAutomationConfigCache } from "@/lib/services/automation-config";
import type { Prisma } from "@prisma/client";

const CONFIG_ID = "platform";

let cachedSettings: PlatformSettings | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function invalidateCache() {
  cachedSettings = null;
  cacheExpiresAt = 0;
}

export async function getPlatformSettings(options?: {
  fresh?: boolean;
}): Promise<PlatformSettings> {
  const now = Date.now();
  if (!options?.fresh && cachedSettings && now < cacheExpiresAt) {
    return cachedSettings;
  }

  try {
    const row = await prisma.platformSettings.findUnique({
      where: { id: CONFIG_ID },
    });

    const settings = row
      ? mergePlatformSettings(row.config, DEFAULT_PLATFORM_SETTINGS)
      : structuredClone(DEFAULT_PLATFORM_SETTINGS);

    cachedSettings = settings;
    cacheExpiresAt = now + CACHE_TTL_MS;
    return settings;
  } catch {
    return structuredClone(DEFAULT_PLATFORM_SETTINGS);
  }
}

export async function getPlatformSettingsResponse(): Promise<PlatformSettingsResponse> {
  const settings = await getPlatformSettings();
  const integrations = await getPlatformIntegrationStatus();

  let updatedAt: string | null = null;
  let updatedByEmail: string | null = null;

  try {
    const row = await prisma.platformSettings.findUnique({
      where: { id: CONFIG_ID },
      select: { updatedAt: true, updatedByEmail: true },
    });
    updatedAt = row?.updatedAt.toISOString() ?? null;
    updatedByEmail = row?.updatedByEmail ?? null;
  } catch {
    // Table may not exist yet — defaults only.
  }

  return {
    settings,
    meta: {
      updatedAt,
      updatedByEmail,
      integrations,
    },
  };
}

export async function updatePlatformSettings(
  patch: PlatformSettingsPatchInput,
  updatedByEmail?: string | null,
): Promise<PlatformSettingsResponse> {
  const current = await getPlatformSettings({ fresh: true });
  const merged = mergePlatformSettings(patch, current);

  const row = await prisma.platformSettings.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      config: merged as unknown as Prisma.InputJsonValue,
      updatedByEmail: updatedByEmail ?? null,
    },
    update: {
      config: merged as unknown as Prisma.InputJsonValue,
      updatedByEmail: updatedByEmail ?? null,
    },
    select: { updatedAt: true, updatedByEmail: true },
  });

  invalidateCache();
  if (patch.general?.defaultTimezone !== undefined) {
    invalidateAutomationConfigCache();
    if (merged.general.defaultTimezone !== current.general.defaultTimezone) {
      const { syncAutomationConfigTimezone } = await import(
        "@/lib/services/automation-config"
      );
      await syncAutomationConfigTimezone(
        merged.general.defaultTimezone,
        updatedByEmail,
      );
    }
  }

  const integrations = await getPlatformIntegrationStatus();

  return {
    settings: merged,
    meta: {
      updatedAt: row.updatedAt.toISOString(),
      updatedByEmail: row.updatedByEmail,
      integrations,
    },
  };
}

export function resetPlatformSettingsCacheForTests() {
  invalidateCache();
}
