import { prisma } from "@/lib/db/prisma";
import { mergeAutomationConfig } from "@/lib/automation/merge-config";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import {
  validateMergedAutomationConfig,
  type AutomationConfigPatchInput,
} from "@/lib/automation/config-schema";
import type {
  AutomationConfigApiResponse,
  AutomationRunLogDto,
  AutomationRunSummary,
  PlatformAutomationConfig,
} from "@/lib/automation/types";
import type { AutomationRunStatus, AutomationRunTrigger, Prisma } from "@prisma/client";

const CONFIG_ID = "platform";
const STALE_RUN_MS = 30 * 60 * 1000;

let cachedConfig: PlatformAutomationConfig | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

export class AutomationDisabledError extends Error {
  constructor(message = "Automations are disabled. Enable them or use dry run.") {
    super(message);
    this.name = "AutomationDisabledError";
  }
}

export class AutomationRunConflictError extends Error {
  constructor(
    message = "Another automation run is already in progress.",
    readonly existingRunId?: string,
  ) {
    super(message);
    this.name = "AutomationRunConflictError";
  }
}

export class AutomationConfigValidationError extends Error {
  constructor(
    message: string,
    readonly path: string[],
  ) {
    super(message);
    this.name = "AutomationConfigValidationError";
  }
}

export class AutomationConfigConflictError extends Error {
  constructor(
    message = "Automation config was updated by someone else. Refresh and retry.",
  ) {
    super(message);
    this.name = "AutomationConfigConflictError";
  }
}

function invalidateCache() {
  cachedConfig = null;
  cacheExpiresAt = 0;
}

function normalizeAutomationConfig(
  config: PlatformAutomationConfig,
): PlatformAutomationConfig {
  return {
    ...config,
    paymentReminders: {
      ...config.paymentReminders,
      reminderDaysBeforeDue: [
        ...new Set(config.paymentReminders.reminderDaysBeforeDue),
      ].sort((a, b) => b - a),
      reminderDaysAfterDue: [
        ...new Set(config.paymentReminders.reminderDaysAfterDue),
      ].sort((a, b) => a - b),
    },
    expiryRenewal: {
      ...config.expiryRenewal,
      renewalReminderDaysBefore: [
        ...new Set(config.expiryRenewal.renewalReminderDaysBefore),
      ].sort((a, b) => a - b),
      expiryWarningDaysBefore: [
        ...new Set(config.expiryRenewal.expiryWarningDaysBefore),
      ].sort((a, b) => a - b),
    },
  };
}

export async function recoverStaleAutomationRuns(): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_RUN_MS);
  const result = await prisma.automationRunLog.updateMany({
    where: {
      status: "RUNNING",
      startedAt: { lt: cutoff },
    },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errors: [
        "Run timed out — marked failed after server interruption or stale lock recovery",
      ] as unknown as Prisma.InputJsonValue,
    },
  });
  return result.count;
}

export async function assertNoActiveAutomationRun(): Promise<void> {
  await recoverStaleAutomationRuns();

  const active = await prisma.automationRunLog.findFirst({
    where: { status: "RUNNING" },
    orderBy: { startedAt: "desc" },
    select: { id: true, trigger: true },
  });

  if (active) {
    throw new AutomationRunConflictError(
      `Automation run ${active.id} (${active.trigger}) is still in progress.`,
      active.id,
    );
  }
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

  const config = normalizeAutomationConfig(
    row ? mergeAutomationConfig(row.config, defaults) : structuredClone(defaults),
  );

  cachedConfig = config;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return config;
}

export async function getAutomationConfigForApi(): Promise<AutomationConfigApiResponse> {
  const [config, platformSettings, row] = await Promise.all([
    getAutomationConfig({ fresh: true }),
    getPlatformSettings({ fresh: true }),
    prisma.platformAutomationConfig.findUnique({
      where: { id: CONFIG_ID },
      select: { updatedAt: true },
    }),
  ]);

  const platformTimezone = platformSettings.general.defaultTimezone;
  const timezoneDrift = config.global.timezone !== platformTimezone;

  return {
    ...config,
    ...(row ? { updatedAt: row.updatedAt.toISOString() } : {}),
    ...(timezoneDrift ? { timezoneDrift: true, platformTimezone } : {}),
  };
}

export async function syncAutomationConfigTimezone(
  timezone: string,
  updatedByEmail?: string | null,
): Promise<void> {
  const current = await getAutomationConfig({ fresh: true });
  if (current.global.timezone === timezone) return;

  const merged = normalizeAutomationConfig(
    mergeAutomationConfig({ global: { timezone } }, current),
  );

  const validation = validateMergedAutomationConfig(merged);
  if (!validation.ok) return;

  const configJson = merged as unknown as Prisma.InputJsonValue;

  await prisma.platformAutomationConfig.upsert({
    where: { id: CONFIG_ID },
    create: {
      id: CONFIG_ID,
      config: configJson,
      updatedByEmail: updatedByEmail ?? null,
    },
    update: {
      config: configJson,
      updatedByEmail: updatedByEmail ?? null,
    },
  });

  invalidateCache();
}

export async function updateAutomationConfig(
  patch: AutomationConfigPatchInput,
  updatedByEmail?: string | null,
): Promise<PlatformAutomationConfig & { updatedAt: string }> {
  const { expectedUpdatedAt, ...configPatch } = patch;
  const currentRow = await prisma.platformAutomationConfig.findUnique({
    where: { id: CONFIG_ID },
  });

  if (expectedUpdatedAt) {
    if (!currentRow) {
      throw new AutomationConfigConflictError();
    }
    const expectedMs = new Date(expectedUpdatedAt).getTime();
    if (
      Number.isNaN(expectedMs) ||
      currentRow.updatedAt.getTime() !== expectedMs
    ) {
      throw new AutomationConfigConflictError();
    }
  }

  const current = await getAutomationConfig({ fresh: true });
  const merged = normalizeAutomationConfig(mergeAutomationConfig(configPatch, current));

  const validation = validateMergedAutomationConfig(merged);
  if (!validation.ok) {
    throw new AutomationConfigValidationError(validation.message, validation.path);
  }

  const configJson = merged as unknown as Prisma.InputJsonValue;

  if (currentRow) {
    const updated = await prisma.platformAutomationConfig.updateMany({
      where: { id: CONFIG_ID, updatedAt: currentRow.updatedAt },
      data: {
        config: configJson,
        updatedByEmail: updatedByEmail ?? null,
      },
    });
    if (updated.count === 0) {
      throw new AutomationConfigConflictError();
    }
  } else {
    await prisma.platformAutomationConfig.create({
      data: {
        id: CONFIG_ID,
        config: configJson,
        updatedByEmail: updatedByEmail ?? null,
      },
    });
  }

  invalidateCache();

  const saved = await prisma.platformAutomationConfig.findUniqueOrThrow({
    where: { id: CONFIG_ID },
    select: { updatedAt: true },
  });

  return { ...merged, updatedAt: saved.updatedAt.toISOString() };
}

function emptySummary(): AutomationRunSummary {
  return {
    invoicesSent: 0,
    invoicesSkipped: 0,
    paymentRemindersSent: 0,
    whatsAppQueued: 0,
    whatsAppSent: 0,
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
  const rawSummary = (row.summary ?? emptySummary()) as AutomationRunSummary;
  const summary: AutomationRunSummary = {
    ...emptySummary(),
    ...rawSummary,
    whatsAppSent: rawSummary.whatsAppSent ?? 0,
  };
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
): Promise<{
  runs: AutomationRunLogDto[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(50, Math.max(1, pageSize))
    : 20;
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
    page: safePage,
    pageSize: safeSize,
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
