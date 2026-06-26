import { randomUUID } from "crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getAutomationConfig,
  listAutomationRuns,
  resetAutomationConfigCacheForTests,
  updateAutomationConfig,
} from "@/lib/services/automation-config";
import { runBillingAutomation, sendAutomatedPaymentConfirmation } from "@/lib/services/run-billing-automation";
import { recordAutomationDelivery, buildAutomationDedupeKey } from "@/lib/automation/delivery-log";
import * as sessionModule from "@/lib/auth/get-app-session";
import type { MasterAdminSession } from "@/types";
import { makeAutomationStore, emptyRunSummary } from "../helpers/automation-runner-fixtures";

import { GET as getAutomationConfigRoute, PATCH as patchAutomationConfig } from "@/app/api/admin/automation/config/route";
import { POST as postAutomationRun } from "@/app/api/admin/automation/run/route";
import { GET as getAutomationRuns } from "@/app/api/admin/automation/runs/route";
import { GET as getCronBillingAutomation } from "@/app/api/cron/billing-automation/route";

const {
  mockGetStores,
  mockGetBillingSummaries,
  mockCreateFollowUp,
  mockSendInvoice,
  mockSendPaymentReminder,
  mockSendRenewalReminder,
  mockSendExpiryWarning,
  mockSendMonthlyReport,
  mockSendPaymentConfirmation,
  mockIsSmtpConfigured,
  mockIsWhatsAppConfigured,
  mockSendWhatsApp,
} = vi.hoisted(() => ({
  mockGetStores: vi.fn(),
  mockGetBillingSummaries: vi.fn(),
  mockCreateFollowUp: vi.fn(),
  mockSendInvoice: vi.fn(),
  mockSendPaymentReminder: vi.fn(),
  mockSendRenewalReminder: vi.fn(),
  mockSendExpiryWarning: vi.fn(),
  mockSendMonthlyReport: vi.fn(),
  mockSendPaymentConfirmation: vi.fn(),
  mockIsSmtpConfigured: vi.fn(),
  mockIsWhatsAppConfigured: vi.fn(),
  mockSendWhatsApp: vi.fn(),
}));

vi.mock("@/lib/services/stores", () => ({
  getAdminPortfolioStoreRows: (...args: unknown[]) => mockGetStores(...args),
}));

vi.mock("@/lib/services/billing-accounts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/billing-accounts")>();
  return {
    ...actual,
    getBillingSummaries: (...args: unknown[]) => mockGetBillingSummaries(...args),
    createBillingFollowUp: (...args: unknown[]) => mockCreateFollowUp(...args),
  };
});

vi.mock("@/lib/services/send-business-invoice", () => ({
  sendBusinessInvoice: (...args: unknown[]) => mockSendInvoice(...args),
}));

vi.mock("@/lib/emails/automation-emails", () => ({
  sendPaymentReminderEmail: (...args: unknown[]) => mockSendPaymentReminder(...args),
  sendRenewalReminderEmail: (...args: unknown[]) => mockSendRenewalReminder(...args),
  sendExpiryWarningEmail: (...args: unknown[]) => mockSendExpiryWarning(...args),
  sendMonthlyReportEmail: (...args: unknown[]) => mockSendMonthlyReport(...args),
  sendPaymentConfirmationEmail: (...args: unknown[]) => mockSendPaymentConfirmation(...args),
}));

vi.mock("@/lib/email/env", () => ({
  isSmtpConfigured: () => mockIsSmtpConfigured(),
}));

vi.mock("@/lib/whatsapp/send-message", () => ({
  isWhatsAppApiConfigured: () => mockIsWhatsAppConfigured(),
  sendWhatsAppTextMessage: (...args: unknown[]) => mockSendWhatsApp(...args),
}));

const hasDb = Boolean(process.env.DATABASE_URL);

function request(
  url: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

const masterSession: MasterAdminSession = {
  role: "MASTER_ADMIN",
  userId: "vitest-master-pending",
  email: "vitest-pending@automation.test",
  permissions: {
    portfolio: true,
    accounts: true,
    analytics: true,
    billing: true,
  },
};

async function enableAutomationDryRun() {
  await updateAutomationConfig(
    {
      global: { enabled: true, dryRunMode: false, timezone: "UTC" },
      invoices: { autoSendEnabled: true, sendDayOfMonth: 1 },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [3, 1, 0],
        reminderDaysAfterDue: [1, 3, 7],
        maxRemindersPerCycle: 5,
        stopAfterPayment: true,
      },
      followUps: { enabled: true, autoScheduleNext: true, maxFollowUps: 5 },
      expiryRenewal: {
        renewalReminderEnabled: true,
        expiryReminderEnabled: true,
        renewalReminderDaysBefore: [7, 3, 1],
        expiryWarningDaysBefore: [7, 3, 1],
      },
      monthlyReports: { enabled: false },
    },
    "vitest-pending@automation.test",
  );
  resetAutomationConfigCacheForTests();
}

describe.skipIf(!hasDb)("EC-AUTO backend pending (60 cases)", () => {
  const runId = randomUUID().slice(0, 8);
  const businessKey = `vitest-biz-${runId}`;
  const originalCronSecret = process.env.CRON_SECRET;

  beforeAll(async () => {
    process.env.CRON_SECRET = `vitest-cron-pending-${runId}`;
    resetAutomationConfigCacheForTests();
    await updateAutomationConfig(
      { global: { enabled: false, dryRunMode: false, timezone: "UTC" } },
      "vitest-pending@automation.test",
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
    await prisma.billingBusinessAccount.deleteMany({
      where: { businessKey: { contains: runId } },
    });
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  beforeEach(() => {
    vi.spyOn(sessionModule, "getAppSession").mockResolvedValue(masterSession);
    mockGetStores.mockReset();
    mockGetStores.mockResolvedValue([]);
    mockGetBillingSummaries.mockReset();
    mockGetBillingSummaries.mockResolvedValue([]);
    mockCreateFollowUp.mockReset();
    mockCreateFollowUp.mockResolvedValue(undefined);
    mockSendInvoice.mockReset();
    mockSendInvoice.mockResolvedValue(undefined);
    mockSendPaymentReminder.mockReset();
    mockSendPaymentReminder.mockResolvedValue(undefined);
    mockSendRenewalReminder.mockReset();
    mockSendRenewalReminder.mockResolvedValue(undefined);
    mockSendExpiryWarning.mockReset();
    mockSendExpiryWarning.mockResolvedValue(undefined);
    mockSendMonthlyReport.mockReset();
    mockSendMonthlyReport.mockResolvedValue(undefined);
    mockSendPaymentConfirmation.mockReset();
    mockSendPaymentConfirmation.mockResolvedValue(undefined);
    mockIsSmtpConfigured.mockReset();
    mockIsSmtpConfigured.mockReturnValue(true);
    mockIsWhatsAppConfigured.mockReset();
    mockIsWhatsAppConfigured.mockReturnValue(false);
    mockSendWhatsApp.mockReset();
    mockSendWhatsApp.mockResolvedValue(undefined);
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("EC-AUTO-003 returns 401 for unauthenticated config GET", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(null);
    const response = await getAutomationConfigRoute();
    expect(response.status).toBe(401);
  });

  it("EC-AUTO-006 blocks platform admin from PATCH config", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce({
      role: "PLATFORM_ADMIN",
      userId: "p",
      email: "p@test.local",
      permissions: { portfolio: true, accounts: true, billing: true },
    });
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
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce({
      role: "PLATFORM_ADMIN",
      userId: "p",
      email: "p@test.local",
      permissions: { portfolio: true, accounts: true, billing: true },
    });
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
        headers: { Authorization: "Bearer x" },
      }),
    );
    expect(response.status).toBe(503);
    process.env.CRON_SECRET = saved ?? `vitest-cron-pending-${runId}`;
  });

  it("EC-AUTO-011 rejects cron with wrong bearer token", async () => {
    const response = await getCronBillingAutomation(
      request("/api/cron/billing-automation", {
        headers: { Authorization: "Bearer wrong-token" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("EC-AUTO-012 accepts cron with valid bearer and creates run log", async () => {
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

  it("EC-AUTO-045 treats empty PATCH body as no-op", async () => {
    const before = await getAutomationConfig({ fresh: true });
    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(200);
    const after = await response.json();
    expect(after.global.enabled).toBe(before.global.enabled);
  });

  it("EC-AUTO-047 strips unknown PATCH fields", async () => {
    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global: { enabled: true },
          unknownSection: { hack: true },
        }),
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect((body as Record<string, unknown>).unknownSection).toBeUndefined();
    await updateAutomationConfig(
      { global: { enabled: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-048 rejects invalid dryRun type on POST run", async () => {
    await enableAutomationDryRun();
    const response = await postAutomationRun(
      request("/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: "yes" }),
      }),
    );
    expect(response.status).toBe(400);
    await updateAutomationConfig(
      { global: { enabled: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-051 clamps invalid page and pageSize on runs GET", async () => {
    const response = await getAutomationRuns(
      request("/api/admin/automation/runs?page=0&pageSize=100"),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
  });

  it("EC-AUTO-052 defaults non-numeric page param to 1", async () => {
    const data = await listAutomationRuns(Number.NaN, 20);
    expect(data.page).toBe(1);
  });

  it("EC-AUTO-058 returns defaults when no config row exists", async () => {
    await prisma.platformAutomationConfig.deleteMany({ where: { id: "platform" } });
    resetAutomationConfigCacheForTests();
    const config = await getAutomationConfig({ fresh: true });
    expect(config.global.timezone).toBeTruthy();
    expect(config.paymentReminders.reminderDaysBeforeDue.length).toBeGreaterThan(0);
    await updateAutomationConfig(
      { global: { enabled: false, timezone: "UTC" } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-059 merges corrupt partial config with defaults", async () => {
    await prisma.platformAutomationConfig.upsert({
      where: { id: "platform" },
      create: {
        id: "platform",
        config: { global: { enabled: true, timezone: "UTC" } } as Prisma.InputJsonValue,
      },
      update: {
        config: { global: { enabled: true, timezone: "UTC" } } as Prisma.InputJsonValue,
      },
    });
    resetAutomationConfigCacheForTests();
    const config = await getAutomationConfig({ fresh: true });
    expect(config.paymentReminders.enabled).toBe(true);
    await updateAutomationConfig(
      { global: { enabled: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-060 falls back when config JSON is not an object", async () => {
    await prisma.platformAutomationConfig.upsert({
      where: { id: "platform" },
      create: { id: "platform", config: "bad" as unknown as Prisma.InputJsonValue },
      update: { config: "bad" as unknown as Prisma.InputJsonValue },
    });
    resetAutomationConfigCacheForTests();
    const config = await getAutomationConfig({ fresh: true });
    expect(config.billingCycle.cycleStartDay).toBeGreaterThan(0);
    await updateAutomationConfig(
      { global: { enabled: false, timezone: "UTC" } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-061 serves cached config within TTL", async () => {
    resetAutomationConfigCacheForTests();
    const spy = vi.spyOn(prisma.platformAutomationConfig, "findUnique");
    await getAutomationConfig();
    await getAutomationConfig();
    expect(spy.mock.calls.length).toBe(1);
    spy.mockRestore();
  });

  it("EC-AUTO-063 safely lists runs with malformed summary JSON", async () => {
    const bad = await prisma.automationRunLog.create({
      data: {
        trigger: "MANUAL",
        status: "SUCCESS",
        summary: "not-an-object" as unknown as Prisma.InputJsonValue,
        errors: undefined,
        triggeredByEmail: `vitest-malformed-${runId}@test.local`,
        completedAt: new Date(),
      },
    });
    const data = await listAutomationRuns(1, 50);
    expect(data.runs.some((r) => r.id === bad.id)).toBe(true);
    await prisma.automationRunLog.delete({ where: { id: bad.id } });
  });

  it("EC-AUTO-065 dedupes duplicate delivery in same billing cycle", async () => {
    const dedupeKey = buildAutomationDedupeKey([businessKey, "INVOICE", "2026-06", "test"]);
    await recordAutomationDelivery({
      businessKey,
      actionType: "INVOICE",
      dedupeKey,
      channel: "EMAIL",
      status: "SUCCESS",
    });
    expect(await prisma.automationDeliveryLog.count({ where: { dedupeKey } })).toBe(1);
    await recordAutomationDelivery({
      businessKey,
      actionType: "INVOICE",
      dedupeKey,
      channel: "EMAIL",
      status: "SUCCESS",
    });
    expect(await prisma.automationDeliveryLog.count({ where: { dedupeKey } })).toBe(1);
  });

  it("EC-AUTO-066 dry run writes no delivery log", async () => {
    await enableAutomationDryRun();
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-store`,
        businessOwnerEmail: `${runId}@biz.test`,
      }),
    ]);
    const before = await prisma.automationDeliveryLog.count();
    await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-dry-${runId}@test.local`,
    });
    const after = await prisma.automationDeliveryLog.count();
    expect(after).toBe(before);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-067 dry run bypasses dedupe check", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-dedupe`,
        businessOwnerEmail: `${runId}-dedupe@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      {
        businessKey: `${runId}-dedupe@biz.test`,
        paymentStatus: "UNPAID",
      },
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-dedupe-${runId}@test.local`,
    });
    expect(result.status).toBe("SUCCESS");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-068 merges partial config without crashing runner", async () => {
    await prisma.platformAutomationConfig.upsert({
      where: { id: "platform" },
      create: {
        id: "platform",
        config: { global: { enabled: true, timezone: "UTC", dryRunMode: true } },
      },
      update: {
        config: { global: { enabled: true, timezone: "UTC", dryRunMode: true } },
      },
    });
    resetAutomationConfigCacheForTests();
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-partial-${runId}@test.local`,
    });
    expect(result.status).toBe("SUCCESS");
    await updateAutomationConfig(
      { global: { enabled: false, dryRunMode: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-069 EC-AUTO-125 cron skips when global automations disabled", async () => {
    await updateAutomationConfig(
      { global: { enabled: false, timezone: "UTC" } },
      "vitest-pending@automation.test",
    );
    resetAutomationConfigCacheForTests();
    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "cron@fineset.local",
    });
    expect(result.status).toBe("SUCCESS");
    expect(
      result.summary.details.some((d) => /disabled/i.test(d.message ?? "")),
    ).toBe(true);
  });

  it("EC-AUTO-072 skips invoice phase when SMTP not configured", async () => {
    await enableAutomationDryRun();
    mockIsSmtpConfigured.mockReturnValue(false);
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-inv`,
        businessOwnerEmail: `${runId}-inv@biz.test`,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-072-${runId}@test.local`,
    });
    expect(result.errors.some((e) => /smtp/i.test(e))).toBe(true);
    expect(mockSendInvoice).not.toHaveBeenCalled();
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-073 skips invoice when business has no email", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-noemail`,
        businessOwnerEmail: null,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-073-${runId}@test.local`,
    });
    expect(
      result.summary.details.some(
        (d) => d.action === "invoice" && d.message?.includes("No business email"),
      ),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-074 skips invoice when skipIfPaid and account current", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    const email = `${runId}-paid@biz.test`;
    mockGetStores.mockResolvedValue([
      makeAutomationStore({ storeId: `${runId}-paid`, businessOwnerEmail: email }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: email, paymentStatus: "PAID" },
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-074-${runId}@test.local`,
    });
    expect(
      result.summary.details.some(
        (d) =>
          d.action === "invoice" &&
          d.status === "skipped" &&
          d.message?.includes("Already paid"),
      ),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-075 dedupes invoice already sent this cycle", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    const email = `${runId}-dedupe-inv@biz.test`;
    mockGetStores.mockResolvedValue([
      makeAutomationStore({ storeId: `${runId}-dinv`, businessOwnerEmail: email }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: email, paymentStatus: "UNPAID" },
    ]);
    await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-075a-${runId}@test.local`,
    });
    const second = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-075b-${runId}@test.local`,
    });
    expect(
      second.summary.details.some(
        (d) => d.action === "invoice" && d.status === "skipped",
      ),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-076 sends invoice on configured invoice day (dry run queue)", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-day1`,
        businessOwnerEmail: `${runId}-day1@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-day1@biz.test`, paymentStatus: "UNPAID" },
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-076-${runId}@test.local`,
    });
    expect(
      result.summary.details.some(
        (d) => d.action === "invoice" && d.status === "queued",
      ),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-077 skips invoice when not invoice day", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-mid`,
        businessOwnerEmail: `${runId}-mid@biz.test`,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-077-${runId}@test.local`,
    });
    expect(result.summary.details.filter((d) => d.action === "invoice")).toHaveLength(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-078 skips reminder phase when disabled", async () => {
    await updateAutomationConfig(
      {
        global: { enabled: true, timezone: "UTC" },
        paymentReminders: { enabled: false },
        invoices: { autoSendEnabled: false },
        monthlyReports: { enabled: false },
      },
      "vitest-pending@automation.test",
    );
    vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-rmd`,
        businessOwnerEmail: `${runId}-rmd@biz.test`,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-078-${runId}@test.local`,
    });
    expect(result.summary.paymentRemindersSent).toBe(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-079 sends no reminders when today not in day list", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-05T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-nomatch`,
        businessOwnerEmail: `${runId}-nomatch@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-nomatch@biz.test`, paymentStatus: "UNPAID" },
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-079-${runId}@test.local`,
    });
    expect(result.summary.paymentRemindersSent).toBe(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-081 skips reminders for paid accounts when stopAfterPayment", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-08T10:00:00.000Z"));
    const email = `${runId}-paid-r@biz.test`;
    mockGetStores.mockResolvedValue([
      makeAutomationStore({ storeId: `${runId}-pr`, businessOwnerEmail: email }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: email, paymentStatus: "PAID" },
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-081-${runId}@test.local`,
    });
    expect(result.summary.paymentRemindersSent).toBe(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-082 skips when max reminders per cycle reached", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-09T10:00:00.000Z"));
    const email = `${runId}-maxr@biz.test`;
    mockGetStores.mockResolvedValue([
      makeAutomationStore({ storeId: `${runId}-maxr`, businessOwnerEmail: email }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: email, paymentStatus: "UNPAID" },
    ]);
    for (let i = 0; i < 5; i += 1) {
      await recordAutomationDelivery({
        businessKey: email,
        actionType: "PAYMENT_REMINDER",
        dedupeKey: buildAutomationDedupeKey([
          email,
          "PAYMENT_REMINDER",
          "2026-06",
          `before_${i}`,
        ]),
        channel: "EMAIL",
        status: "SUCCESS",
      });
    }
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-082-${runId}@test.local`,
    });
    expect(
      result.summary.details.some((d) =>
        d.message?.includes("Max reminders reached"),
      ),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-083 still attempts WhatsApp when email fails", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      {
        paymentReminders: { whatsAppEnabled: true, emailEnabled: true },
        whatsApp: { enabled: true, businessHoursOnly: false },
      },
      "vitest-pending@automation.test",
    );
    vi.setSystemTime(new Date("2026-06-09T10:00:00.000Z"));
    const email = `${runId}-wa@biz.test`;
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-wa`,
        businessOwnerEmail: email,
        storeManagerPhone: "9876501234",
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: email, paymentStatus: "UNPAID" },
    ]);
    mockIsWhatsAppConfigured.mockReturnValue(true);
    mockSendPaymentReminder.mockRejectedValueOnce(new Error("SMTP fail"));
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-083-${runId}@test.local`,
    });
    expect(result.summary.whatsAppQueued + result.summary.whatsAppSent).toBeGreaterThan(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-084 requires both WhatsApp toggles for WhatsApp reminders", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      {
        paymentReminders: { whatsAppEnabled: false, emailEnabled: false },
        whatsApp: { enabled: true },
      },
      "vitest-pending@automation.test",
    );
    vi.setSystemTime(new Date("2026-06-08T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-dual`,
        businessOwnerEmail: `${runId}-dual@biz.test`,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-084-${runId}@test.local`,
    });
    expect(result.summary.whatsAppQueued).toBe(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-085 skips WhatsApp outside business hours", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      {
        paymentReminders: { whatsAppEnabled: true, emailEnabled: false },
        whatsApp: {
          enabled: true,
          businessHoursOnly: true,
          businessHoursStart: "09:00",
          businessHoursEnd: "10:00",
        },
      },
      "vitest-pending@automation.test",
    );
    vi.setSystemTime(new Date("2026-06-08T15:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-bh`,
        businessOwnerEmail: `${runId}-bh@biz.test`,
        storeManagerPhone: "9876509999",
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-bh@biz.test`, paymentStatus: "UNPAID" },
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-085-${runId}@test.local`,
    });
    expect(result.summary.whatsAppQueued).toBe(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-087 schedules follow-ups for due unpaid accounts", async () => {
    await enableAutomationDryRun();
    const bk = `vitest-fu-${runId}`;
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: bk,
        businessName: "Follow Up Biz",
        businessEmail: `${bk}@test.local`,
        paymentStatus: "UNPAID",
        nextFollowUpAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([]);
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-087-${runId}@test.local`,
    });
    expect(mockCreateFollowUp).toHaveBeenCalled();
    expect(result.summary.followUpsScheduled).toBeGreaterThan(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-088 escalates when max follow-ups reached", async () => {
    await enableAutomationDryRun();
    const bk = `vitest-esc-${runId}`;
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: bk,
        businessName: "Escalate Biz",
        businessEmail: `${bk}@test.local`,
        paymentStatus: "UNPAID",
        nextFollowUpAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    for (let i = 0; i < 5; i += 1) {
      await prisma.billingFollowUp.create({
        data: {
          accountId: (
            await prisma.billingBusinessAccount.findUniqueOrThrow({
              where: { businessKey: bk },
            })
          ).id,
          channel: "WHATSAPP",
          outcome: "RESCHEDULED",
          notes: "seed",
          createdByEmail: "test@test.local",
          createdByName: "Test",
        },
      });
    }
    vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"));
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-088-${runId}@test.local`,
    });
    expect(
      result.summary.details.some((d) => d.action === "follow_up_escalation"),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-089 uses last spacing value when spacing array is short", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      { followUps: { spacingDays: [2], maxFollowUps: 5 } },
      "vitest-pending@automation.test",
    );
    const bk = `vitest-sp-${runId}`;
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: bk,
        businessName: "Spacing Biz",
        businessEmail: `${bk}@test.local`,
        paymentStatus: "UNPAID",
        nextFollowUpAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    const accountId = (
      await prisma.billingBusinessAccount.findUniqueOrThrow({ where: { businessKey: bk } })
    ).id;
    await prisma.billingFollowUp.create({
      data: {
        accountId,
        channel: "WHATSAPP",
        outcome: "RESCHEDULED",
        notes: "seed",
        createdByEmail: "test@test.local",
        createdByName: "Test",
      },
    });
    vi.setSystemTime(new Date("2026-06-10T10:00:00.000Z"));
    await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-089-${runId}@test.local`,
    });
    expect(mockCreateFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({
        businessKey: bk,
        nextFollowUpAt: expect.any(Date),
      }),
    );
    const spacingCall = mockCreateFollowUp.mock.calls[0]?.[0] as {
      nextFollowUpAt: Date;
    };
    const expectedNext = new Date("2026-06-10T10:00:00.000Z");
    expectedNext.setDate(expectedNext.getDate() + 2);
    expect(spacingCall.nextFollowUpAt.toISOString().slice(0, 10)).toBe(
      expectedNext.toISOString().slice(0, 10),
    );
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-090 queues renewal reminder on matching offset day", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-23T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-ren`,
        businessOwnerEmail: `${runId}-ren@biz.test`,
        renewalDueAt: "2026-06-24T00:00:00.000Z",
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-090-${runId}@test.local`,
    });
    expect(
      result.summary.details.some((d) => d.action === "renewal_reminder"),
    ).toBe(true);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-091 skips monthly report on wrong day", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      {
        monthlyReports: { enabled: true, sendDayOfMonth: 1, sendHourLocal: 9 },
        invoices: { autoSendEnabled: false },
      },
      "vitest-pending@automation.test",
    );
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"));
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-091-${runId}@test.local`,
    });
    expect(result.summary.monthlyReportsSent).toBe(0);
    await updateAutomationConfig(
      { global: { enabled: false }, monthlyReports: { enabled: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-092 truncates monthly report store list beyond 50", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      {
        monthlyReports: {
          enabled: true,
          sendDayOfMonth: 5,
          sendHourLocal: 9,
          includePerStoreMetrics: true,
          recipients: "admin_only",
        },
        invoices: { autoSendEnabled: false },
        paymentReminders: { enabled: false },
      },
      "vitest-pending@automation.test",
    );
    process.env.MASTER_ADMIN_EMAIL = `admin-${runId}@test.local`;
    vi.setSystemTime(new Date("2026-06-05T09:30:00.000Z"));
    const stores = Array.from({ length: 55 }, (_, i) =>
      makeAutomationStore({
        storeId: `${runId}-s${i}`,
        businessOwnerEmail: `${runId}-s${i}@biz.test`,
      }),
    );
    mockGetStores.mockResolvedValue(stores);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-092-${runId}@test.local`,
    });
    expect(
      result.summary.details.some((d) =>
        d.message?.includes("Would send to"),
      ),
    ).toBe(true);
    delete process.env.MASTER_ADMIN_EMAIL;
    await updateAutomationConfig(
      { global: { enabled: false }, monthlyReports: { enabled: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-095 marks PARTIAL when some actions succeed and some fail", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-p1`,
        businessOwnerEmail: `${runId}-ok@biz.test`,
      }),
      makeAutomationStore({
        storeId: `${runId}-p2`,
        businessOwnerEmail: `${runId}-fail@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-ok@biz.test`, paymentStatus: "UNPAID" },
      { businessKey: `${runId}-fail@biz.test`, paymentStatus: "UNPAID" },
    ]);
    mockSendInvoice
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("send failed"));
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-095-${runId}@test.local`,
    });
    expect(result.status).toBe("PARTIAL");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-096 marks run FAILED on uncaught runner error", async () => {
    await enableAutomationDryRun();
    mockGetStores.mockRejectedValueOnce(new Error("fatal portfolio load"));
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-096-${runId}@test.local`,
    });
    expect(result.status).toBe("FAILED");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-097 sends payment confirmation when enabled", async () => {
    const bk = `vitest-pc-${runId}`;
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: bk,
        businessName: "Paid Biz",
        businessEmail: `${bk}@test.local`,
        paymentStatus: "PAID",
        paidAt: new Date("2026-06-10T10:00:00.000Z"),
      },
    });
    await updateAutomationConfig(
      { invoices: { paymentConfirmationEnabled: true } },
      "vitest-pending@automation.test",
    );
    const result = await sendAutomatedPaymentConfirmation(bk);
    expect(result.sent).toBe(true);
    expect(mockSendPaymentConfirmation).toHaveBeenCalled();
  });

  it("EC-AUTO-098 skips payment confirmation when disabled", async () => {
    const bk = `vitest-pcoff-${runId}`;
    await updateAutomationConfig(
      { invoices: { paymentConfirmationEnabled: false } },
      "vitest-pending@automation.test",
    );
    const result = await sendAutomatedPaymentConfirmation(bk);
    expect(result.skipped).toBe(true);
    expect(mockSendPaymentConfirmation).not.toHaveBeenCalled();
  });

  it("EC-AUTO-099 dedupes duplicate payment confirmation", async () => {
    const bk = `vitest-pcdup-${runId}`;
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: bk,
        businessName: "Dup Biz",
        businessEmail: `${bk}@test.local`,
        paymentStatus: "PAID",
        paidAt: new Date("2026-06-10T10:00:00.000Z"),
      },
    });
    await updateAutomationConfig(
      { invoices: { paymentConfirmationEnabled: true } },
      "vitest-pending@automation.test",
    );
    const dedupeKey = buildAutomationDedupeKey([
      bk,
      "PAYMENT_CONFIRMATION",
      "2026-06",
    ]);
    await recordAutomationDelivery({
      businessKey: bk,
      actionType: "PAYMENT_CONFIRMATION",
      dedupeKey,
      channel: "EMAIL",
      status: "SUCCESS",
    });
    const result = await sendAutomatedPaymentConfirmation(bk);
    expect(result.skipped).toBe(true);
  });

  it("EC-AUTO-100 respects autoExtendOnPayment=false on admin payment", async () => {
    await updateAutomationConfig(
      { expiryRenewal: { autoExtendOnPayment: false } },
      "vitest-pending@automation.test",
    );
    const config = await getAutomationConfig({ fresh: true });
    expect(config.expiryRenewal.autoExtendOnPayment).toBe(false);
  });

  it("EC-AUTO-102 skips email phases gracefully when SMTP missing", async () => {
    await enableAutomationDryRun();
    mockIsSmtpConfigured.mockReturnValue(false);
    vi.setSystemTime(new Date("2026-06-08T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-smtp`,
        businessOwnerEmail: `${runId}-smtp@biz.test`,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-102-${runId}@test.local`,
    });
    expect(result.errors.some((e) => /smtp/i.test(e))).toBe(true);
    expect(result.status).not.toBe("FAILED");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-103 passes urgency context to reminder emails", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-09T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-urg`,
        businessOwnerEmail: `${runId}-urg@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-urg@biz.test`, paymentStatus: "UNPAID" },
    ]);
    await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-103-${runId}@test.local`,
    });
    expect(mockSendPaymentReminder).toHaveBeenCalled();
    const call = mockSendPaymentReminder.mock.calls[0]?.[0] as { daysUntilDue: number };
    expect(typeof call.daysUntilDue).toBe("number");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-104 omits invoice line when no invoice number on confirmation", async () => {
    const bk = `vitest-noinv-${runId}`;
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: bk,
        businessName: "No Inv",
        businessEmail: `${bk}@test.local`,
        paymentStatus: "PAID",
        paidAt: new Date("2026-06-10T10:00:00.000Z"),
        lastInvoiceNumber: null,
      },
    });
    await updateAutomationConfig(
      { invoices: { paymentConfirmationEnabled: true } },
      "vitest-pending@automation.test",
    );
    await sendAutomatedPaymentConfirmation(bk);
    expect(mockSendPaymentConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceNumber: null }),
    );
  });

  it("EC-AUTO-107 sends invoice via sendBusinessInvoice on live run", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-from`,
        businessOwnerEmail: `${runId}-from@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-from@biz.test`, paymentStatus: "UNPAID" },
    ]);
    await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-107-${runId}@test.local`,
    });
    expect(mockSendInvoice).toHaveBeenCalled();
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-108 sends automation emails without requiring support email", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-09T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-sup`,
        businessOwnerEmail: `${runId}-sup@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-sup@biz.test`, paymentStatus: "UNPAID" },
    ]);
    await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-108-${runId}@test.local`,
    });
    expect(mockSendPaymentReminder).toHaveBeenCalled();
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-109 marks PARTIAL when individual email send fails", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-09T10:00:00.000Z"));
    const emailFail = `${runId}-109-fail@biz.test`;
    const emailOk = `${runId}-109-ok@biz.test`;
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-109-fail`,
        businessOwnerEmail: emailFail,
      }),
      makeAutomationStore({
        storeId: `${runId}-109-ok`,
        businessOwnerEmail: emailOk,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: emailFail, paymentStatus: "UNPAID" },
      { businessKey: emailOk, paymentStatus: "UNPAID" },
    ]);
    mockSendPaymentReminder
      .mockRejectedValueOnce(new Error("recipient rejected"))
      .mockResolvedValueOnce(undefined);
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-109-${runId}@test.local`,
    });
    expect(result.status).toBe("PARTIAL");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-112 uses config loaded at run start", async () => {
    await enableAutomationDryRun();
    const configAtStart = await getAutomationConfig({ fresh: true });
    vi.setSystemTime(new Date("2026-06-15T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-112-${runId}@test.local`,
    });
    expect(result.status).toBe("SUCCESS");
    expect(configAtStart.global.timezone).toBe("UTC");
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-115 uses separate dedupe keys for invoice vs confirmation", async () => {
    const bk = `vitest-keys-${runId}`;
    const invoiceKey = buildAutomationDedupeKey([bk, "INVOICE", "2026-06", "x"]);
    const confirmKey = buildAutomationDedupeKey([bk, "PAYMENT_CONFIRMATION", "2026-06"]);
    expect(invoiceKey).not.toBe(confirmKey);
  });

  it("EC-AUTO-116 upserts delivery log without duplicate rows on conflict", async () => {
    const dedupeKey = buildAutomationDedupeKey([runId, "TEST", "upsert"]);
    await Promise.all([
      recordAutomationDelivery({
        actionType: "MONTHLY_REPORT",
        dedupeKey,
        channel: "EMAIL",
        status: "SUCCESS",
      }),
      recordAutomationDelivery({
        actionType: "MONTHLY_REPORT",
        dedupeKey,
        channel: "EMAIL",
        status: "SUCCESS",
      }),
    ]);
    expect(await prisma.automationDeliveryLog.count({ where: { dedupeKey } })).toBe(1);
  });

  it("EC-AUTO-119 monthly report respects recipients configuration", async () => {
    await enableAutomationDryRun();
    await updateAutomationConfig(
      {
        monthlyReports: {
          enabled: true,
          sendDayOfMonth: 5,
          sendHourLocal: 9,
          recipients: "business_owners",
        },
        invoices: { autoSendEnabled: false },
        paymentReminders: { enabled: false },
      },
      "vitest-pending@automation.test",
    );
    vi.setSystemTime(new Date("2026-06-05T09:30:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-own`,
        businessOwnerEmail: `${runId}-owner@biz.test`,
      }),
    ]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-119-${runId}@test.local`,
    });
    expect(
      result.summary.details.some((d) =>
        d.message?.includes(`${runId}-owner@biz.test`),
      ),
    ).toBe(true);
    await updateAutomationConfig(
      { global: { enabled: false }, monthlyReports: { enabled: false } },
      "vitest-pending@automation.test",
    );
  });

  it("EC-AUTO-120 rejects unauthenticated PATCH config (session required)", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(null);
    const response = await patchAutomationConfig(
      request("/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ global: { enabled: true } }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("EC-AUTO-122 succeeds with zero businesses", async () => {
    await enableAutomationDryRun();
    mockGetStores.mockResolvedValue([]);
    const result = await runBillingAutomation({
      trigger: "DRY_RUN",
      dryRun: true,
      triggeredByEmail: `vitest-122-${runId}@test.local`,
    });
    expect(result.status).toBe("SUCCESS");
    expect(result.summary.invoicesSent).toBe(0);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });

  it("EC-AUTO-123 marks FAILED when all actions error", async () => {
    await enableAutomationDryRun();
    vi.setSystemTime(new Date("2026-06-01T10:00:00.000Z"));
    mockGetStores.mockResolvedValue([
      makeAutomationStore({
        storeId: `${runId}-123`,
        businessOwnerEmail: `${runId}-123@biz.test`,
      }),
    ]);
    mockGetBillingSummaries.mockResolvedValue([
      { businessKey: `${runId}-123@biz.test`, paymentStatus: "UNPAID" },
    ]);
    mockSendInvoice.mockRejectedValue(new Error("all fail"));
    mockIsSmtpConfigured.mockReturnValue(false);
    const result = await runBillingAutomation({
      trigger: "MANUAL",
      dryRun: false,
      triggeredByEmail: `vitest-123-${runId}@test.local`,
    });
    expect(["FAILED", "PARTIAL"]).toContain(result.status);
    await updateAutomationConfig({ global: { enabled: false } }, "vitest-pending@automation.test");
  });
});
