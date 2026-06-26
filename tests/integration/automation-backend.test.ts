import { randomUUID } from "crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  assertNoActiveAutomationRun,
  AutomationRunConflictError,
  recoverStaleAutomationRuns,
  resetAutomationConfigCacheForTests,
  syncAutomationConfigTimezone,
  updateAutomationConfig,
  getAutomationConfig as readAutomationConfig,
} from "@/lib/services/automation-config";
import {
  resetPlatformSettingsCacheForTests,
  updatePlatformSettings,
} from "@/lib/services/platform-settings";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";
import * as sessionModule from "@/lib/auth/get-app-session";
import type { MasterAdminSession, PlatformAdminSession } from "@/types";

import { GET as getAutomationConfig, PATCH as patchAutomationConfig } from "@/app/api/admin/automation/config/route";
import { POST as postAutomationRun } from "@/app/api/admin/automation/run/route";
import { GET as getAutomationRuns } from "@/app/api/admin/automation/runs/route";
import { GET as getCronBillingAutomation } from "@/app/api/cron/billing-automation/route";

const hasDb = Boolean(process.env.DATABASE_URL);

function request(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

const masterSession: MasterAdminSession = {
  role: "MASTER_ADMIN",
  userId: "vitest-master-admin",
  email: "vitest-master@automation.test",
  permissions: {
    portfolio: true,
    accounts: true,
    analytics: true,
    billing: true,
  },
};

describe.skipIf(!hasDb)("automation backend integration", () => {
  const runId = randomUUID().slice(0, 8);

  const platformAdminWithBilling: PlatformAdminSession = {
    role: "PLATFORM_ADMIN",
    userId: "vitest-platform-billing",
    email: `vitest-platform-billing-${runId}@automation.test`,
    permissions: {
      portfolio: true,
      accounts: true,
      billing: true,
    },
  };

  const platformAdminNoBilling: PlatformAdminSession = {
    role: "PLATFORM_ADMIN",
    userId: "vitest-platform-no-billing",
    email: `vitest-platform-no-billing-${runId}@automation.test`,
    permissions: {
      portfolio: true,
      accounts: true,
    },
  };
  const originalCronSecret = process.env.CRON_SECRET;
  const originalMasterAdminEmail = process.env.MASTER_ADMIN_EMAIL;

  beforeAll(async () => {
    process.env.CRON_SECRET = `vitest-cron-${runId}`;
    delete process.env.MASTER_ADMIN_EMAIL;
    resetAutomationConfigCacheForTests();

    await updateAutomationConfig(
      {
        global: { enabled: false, dryRunMode: false, timezone: "Asia/Kolkata" },
        paymentReminders: {
          enabled: true,
          reminderDaysBeforeDue: [3, 3, 1],
          reminderDaysAfterDue: [1, 3, 7],
        },
      },
      "vitest@automation.test",
    );
  }, 60_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    resetAutomationConfigCacheForTests();

    await prisma.automationDeliveryLog.deleteMany({
      where: { dedupeKey: { contains: runId } },
    });
    await prisma.automationRunLog.deleteMany({
      where: { triggeredByEmail: { contains: "vitest" } },
    });

    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
    if (originalMasterAdminEmail === undefined) {
      delete process.env.MASTER_ADMIN_EMAIL;
    } else {
      process.env.MASTER_ADMIN_EMAIL = originalMasterAdminEmail;
    }
  });

  beforeEach(() => {
    vi.spyOn(sessionModule, "getAppSession").mockResolvedValue(masterSession);
  });

  it("EC-AUTO-003 returns 401 for unauthenticated config GET", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(null);

    const response = await getAutomationConfig();
    expect(response.status).toBe(401);
  });

  it("EC-AUTO-004 returns 403 for platform admin without billing on config GET", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(platformAdminNoBilling);

    const response = await getAutomationConfig();
    expect(response.status).toBe(403);
  });

  it("EC-AUTO-005 allows platform admin with billing to read config", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(platformAdminWithBilling);

    const response = await getAutomationConfig();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.global).toBeTruthy();
  });

  it("EC-AUTO-006 blocks platform admin from PATCH config", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(platformAdminWithBilling);

    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: { enabled: true } }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("EC-AUTO-007 blocks platform admin from POST run", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(platformAdminWithBilling);

    const response = await postAutomationRun(
      request("/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      }),
    );

    expect(response.status).toBe(403);
  });

  it("EC-AUTO-010 returns 503 when CRON_SECRET is unset", async () => {
    const saved = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const response = await getCronBillingAutomation(
      request("/api/cron/billing-automation", {
        headers: { Authorization: "Bearer anything" },
      }),
    );

    expect(response.status).toBe(503);

    if (saved === undefined) {
      process.env.CRON_SECRET = `vitest-cron-${runId}`;
    } else {
      process.env.CRON_SECRET = saved;
    }
  });

  it("EC-AUTO-062 syncs automation timezone when platform default changes", async () => {
    resetPlatformSettingsCacheForTests();
    resetAutomationConfigCacheForTests();

    await updatePlatformSettings(
      { general: { defaultTimezone: "Asia/Kolkata" } },
      "vitest@automation.test",
    );
    await syncAutomationConfigTimezone("Asia/Kolkata", "vitest@automation.test");

    await updatePlatformSettings(
      { general: { defaultTimezone: "UTC" } },
      "vitest@automation.test",
    );

    const config = await readAutomationConfig({ fresh: true });
    expect(config.global.timezone).toBe("UTC");
  });

  it("EC-AUTO-013 blocks manual run when automations are disabled", async () => {
    const response = await postAutomationRun(
      request("/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false }),
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/disabled/i);
  });

  it("EC-AUTO-013 allows dry run when automations are disabled", async () => {
    const response = await postAutomationRun(
      request("/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runId).toBeTruthy();
    expect(body.status).toBeTruthy();
  });

  it("returns 400 for malformed JSON on POST run", async () => {
    const response = await postAutomationRun(
      request("/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Invalid JSON");
  });

  it("EC-AUTO-114 returns 409 when expectedUpdatedAt is stale", async () => {
    const current = await updateAutomationConfig(
      { global: { dryRunMode: false } },
      "vitest@automation.test",
    );

    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global: { dryRunMode: true },
          expectedUpdatedAt: new Date(Date.now() - 60_000).toISOString(),
        }),
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.message).toMatch(/updated by someone else/i);

    const latest = await updateAutomationConfig(
      { global: { dryRunMode: current.global.dryRunMode } },
      "vitest@automation.test",
    );
    expect(latest.updatedAt).toBeTruthy();
  });

  it("EC-AUTO-046 returns 400 for malformed JSON on PATCH config", async () => {
    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Invalid JSON");
  });

  it("EC-AUTO-042 rejects invalid timezone on PATCH config", async () => {
    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: { timezone: "Not/A_Valid_Zone" } }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Validation failed");
    expect(body.details).toBeTruthy();
  });

  it("EC-AUTO-040 dedupes reminder day arrays on save", async () => {
    const config = await updateAutomationConfig(
      {
        paymentReminders: {
          reminderDaysBeforeDue: [3, 3, 1, 1],
          reminderDaysAfterDue: [7, 3, 3, 1],
        },
      },
      "vitest@automation.test",
    );

    expect(config.paymentReminders.reminderDaysBeforeDue).toEqual([3, 1]);
    expect(config.paymentReminders.reminderDaysAfterDue).toEqual([1, 3, 7]);
  });

  it("EC-AUTO-041 rejects empty reminder arrays when reminders enabled", async () => {
    await expect(
      updateAutomationConfig(
        {
          paymentReminders: {
            enabled: true,
            reminderDaysBeforeDue: [],
          },
        },
        "vitest@automation.test",
      ),
    ).rejects.toThrow(/reminderDaysBeforeDue cannot be empty/);
  });

  it("EC-AUTO-110 rejects overlapping automation runs", async () => {
    const running = await prisma.automationRunLog.create({
      data: {
        trigger: "MANUAL",
        status: "RUNNING",
        summary: {
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
        },
        triggeredByEmail: `vitest-overlap-${runId}@test.local`,
      },
    });

    await expect(assertNoActiveAutomationRun()).rejects.toBeInstanceOf(
      AutomationRunConflictError,
    );

    await prisma.automationRunLog.delete({ where: { id: running.id } });
  });

  it("EC-AUTO-064 recovers stale RUNNING logs", async () => {
    const stale = await prisma.automationRunLog.create({
      data: {
        trigger: "CRON",
        status: "RUNNING",
        startedAt: new Date(Date.now() - 31 * 60 * 1000),
        summary: {
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
        },
        triggeredByEmail: `vitest-stale-${runId}@test.local`,
      },
    });

    const recovered = await recoverStaleAutomationRuns();
    expect(recovered).toBeGreaterThanOrEqual(1);

    const row = await prisma.automationRunLog.findUnique({ where: { id: stale.id } });
    expect(row?.status).toBe("FAILED");
    expect(row?.completedAt).toBeTruthy();
  });

  it("EC-AUTO-101 marks run FAILED for invalid stored timezone", async () => {
    await prisma.platformAutomationConfig.upsert({
      where: { id: "platform" },
      create: {
        id: "platform",
        config: {
          global: {
            enabled: true,
            dryRunMode: true,
            timezone: "Invalid/Timezone",
          },
        },
      },
      update: {
        config: {
          global: {
            enabled: true,
            dryRunMode: true,
            timezone: "Invalid/Timezone",
          },
        },
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-tz-${runId}@test.local`,
    });

    expect(result.status).toBe("FAILED");
    expect(result.errors.some((e) => /invalid automation timezone/i.test(e))).toBe(true);

    await updateAutomationConfig(
      { global: { enabled: false, dryRunMode: false, timezone: "Asia/Kolkata" } },
      "vitest@automation.test",
    );
  });

  it("EC-AUTO-117 rejects cron with wrong bearer token", async () => {
    const response = await getCronBillingAutomation(
      request("/api/cron/billing-automation", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );

    expect(response.status).toBe(401);
  });

  it("EC-AUTO-117 accepts cron with valid bearer token", async () => {
    const response = await getCronBillingAutomation(
      request("/api/cron/billing-automation", {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runId).toBeTruthy();
    expect(body.status).toBeTruthy();
  });

  it("EC-AUTO-053 exposes run status in API response", async () => {
    const response = await postAutomationRun(
      request("/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(["SUCCESS", "PARTIAL", "FAILED"]).toContain(body.status);
    expect(Array.isArray(body.errors)).toBe(true);
  });
});
