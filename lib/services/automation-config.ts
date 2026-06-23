import { prisma } from "@/lib/db/prisma";
import { mergeAutomationConfig } from "@/lib/automation/merge-config";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import type {
  AutomationRunLogDto,
  AutomationRunSummary,
  PlatformAutomationConfig,
} from "@/lib/automation/types";
import type { AutomationConfigPatchInput } from "@/lib/automation/config-schema";
import type { AutomationRunStatus, AutomationRunTrigger, Prisma } from "@prisma/client";

const CONFIG_ID = "platform";

let cachedConfig: PlatformAutomationConfig | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

function invalidateCache() {
  cachedConfig = null;
  cacheExpiresAt = 0;
}

export async function getAutomationConfig(
  options?: { fresh?: boolean },
): Promise<PlatformAutomationConfig> {
  const now = Date.now();
  if (!options?.fresh && cachedConfig && now < cacheExpiresAt) {
    return cachedConfig;
  }

  const platformSettings = await getPlatformSettings();
  const defaults: PlatformAutomationConfig = {
    ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    global: {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
      timezone: platformSettings.general.defaultTimezone,
    },
  };

  const row = await prisma.platformAutomationConfig.findUnique({
    where: { id: CONFIG_ID },
  });

  const config = row
    ? mergeAutomationConfig(row.config, defaults)
    : structuredClone(defaults);

  cachedConfig = config;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return config;
}

export async function updateAutomationConfig(
  patch: AutomationConfigPatchInput,
  updatedByEmail?: string | null,
): Promise<PlatformAutomationConfig> {
  const current = await getAutomationConfig({ fresh: true });
  const merged = mergeAutomationConfig(patch, current);

  await prisma.platformAutomationConfig.upsert({
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
  });

  invalidateCache();
  return merged;
}

function emptySummary(): AutomationRunSummary {
  return {
    invoicesSent: 0,
    invoicesSkipped: 0,
    paymentRemindersSent: 0,
    whatsAppQueued: 0,
    followUpsScheduled: 0,
    renewalRemindersSent: 0,
    expiryWarningsSent: 0,
    monthlyReportsSent: 0,
    paymentConfirmationsSent: 0,
    details: [],
  };
}

function mapRunLog(row: {
  id: string;
  trigger: AutomationRunTrigger;
  status: AutomationRunStatus;
  startedAt: Date;
  completedAt: Date | null;
  summary: unknown;
  errors: unknown;
  triggeredByEmail: string | null;
}): AutomationRunLogDto {
  const summary = (row.summary ?? emptySummary()) as AutomationRunSummary;
  const errors = Array.isArray(row.errors)
    ? row.errors.filter((item): item is string => typeof item === "string")
    : null;

  return {
    id: row.id,
    trigger: row.trigger,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    summary,
    errors,
    triggeredByEmail: row.triggeredByEmail,
  };
}

export async function listAutomationRuns(
  page = 1,
  pageSize = 20,
): Promise<{ runs: AutomationRunLogDto[]; total: number }> {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(50, Math.max(1, pageSize));
  const skip = (safePage - 1) * safeSize;

  const [rows, total] = await Promise.all([
    prisma.automationRunLog.findMany({
      orderBy: { startedAt: "desc" },
      skip,
      take: safeSize,
    }),
    prisma.automationRunLog.count(),
  ]);

  return {
    runs: rows.map(mapRunLog),
    total,
  };
}

export async function createAutomationRunLog(input: {
  trigger: AutomationRunTrigger;
  triggeredByEmail?: string | null;
}): Promise<{ id: string }> {
  const row = await prisma.automationRunLog.create({
    data: {
      trigger: input.trigger,
      status: "RUNNING",
      summary: emptySummary() as unknown as Prisma.InputJsonValue,
      triggeredByEmail: input.triggeredByEmail ?? null,
    },
    select: { id: true },
  });
  return row;
}

export async function completeAutomationRunLog(
  id: string,
  input: {
    status: AutomationRunStatus;
    summary: AutomationRunSummary;
    errors?: string[];
  },
): Promise<void> {
  await prisma.automationRunLog.update({
    where: { id },
    data: {
      status: input.status,
      summary: input.summary as unknown as Prisma.InputJsonValue,
      errors: input.errors?.length
        ? (input.errors as unknown as Prisma.InputJsonValue)
        : undefined,
      completedAt: new Date(),
    },
  });
}

export function invalidateAutomationConfigCache() {
  invalidateCache();
}

export function resetAutomationConfigCacheForTests() {
  invalidateCache();
}
