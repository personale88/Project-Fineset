import { GET as getBillingAutomationCron } from "@/app/api/cron/billing-automation/route";
import { POST as postAutomationRun } from "@/app/api/admin/automation/run/route";
import { GET as getAutomationConfigRoute, PATCH as patchAutomationConfig } from "@/app/api/admin/automation/config/route";
import { randomUUID } from "crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  billingCycleMonthKeyInTimezone,
  getDayOfMonthInTimezone,
  getHourInTimezone,
  isWithinBusinessHoursInTimezone,
  shouldRunAtHourInTimezone,
  shouldRunOnDayInTimezone,
} from "@/lib/automation/timezone";
import * as sessionModule from "@/lib/auth/session";
import * as billingAccountsModule from "@/lib/services/billing-accounts";
import * as emailEnv from "@/lib/email/env";
import * as sendBusinessInvoiceModule from "@/lib/services/send-business-invoice";
import * as storesModule from "@/lib/services/stores";
import {
  getAutomationConfig,
  resetAutomationConfigCacheForTests,
  updateAutomationConfig,
} from "@/lib/services/automation-config";
import * as automationConfigModule from "@/lib/services/automation-config";
import { runBillingAutomation, sendAutomatedPaymentConfirmation } from "@/lib/services/run-billing-automation";
import * as runBillingAutomationModule from "@/lib/services/run-billing-automation";
import { buildAutomationDedupeKey } from "@/lib/automation/delivery-log";
import { mergeAutomationConfig, toBillingCycleSettings } from "@/lib/automation/merge-config";
import * as automationEmailsModule from "@/lib/emails/automation-emails";
import { getPaymentDeadline, startOfCalendarDay } from "@/lib/utils/billing-cycle";
import type {
  AdminStorePortfolioRow,
  MasterAdminSession,
  PlatformAdminSession,
  StoreSession,
} from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);

function makePortfolioStore(input: {
  storeId: string;
  ownerEmail: string;
  renewalDueAt?: string | null;
  dataExpiryAt?: string | null;
  storeName?: string;
}): AdminStorePortfolioRow {
  const now = new Date().toISOString();
  return {
    storeId: input.storeId,
    storeName: input.storeName ?? `Store ${input.storeId}`,
    category: "JEWELRY",
    city: "Mumbai",
    state: "MH",
    isActive: true,
    businessOwnerName: "Partial Test Owner",
    businessOwnerEmail: input.ownerEmail,
    storeManagerName: null,
    storeManagerPhone: null,
    staffCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    purgeAt: null,
    dataExpiryAt: input.dataExpiryAt ?? null,
    renewalDueAt: input.renewalDueAt ?? null,
    ownerLastLoginAt: null,
  };
}

function addCalendarDays(reference: Date, days: number): string {
  const date = new Date(reference);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function daysUntilPaymentDeadline(
  reference: Date,
  cycleSettings: ReturnType<typeof toBillingCycleSettings>,
): number {
  const deadline = getPaymentDeadline(reference, cycleSettings);
  const from = startOfCalendarDay(reference).getTime();
  const to = startOfCalendarDay(deadline).getTime();
  return Math.round((to - from) / (24 * 60 * 60 * 1000));
}

function businessHoursOutsideNow(timezone: string, reference = new Date()): {
  start: string;
  end: string;
} {
  const hour = getHourInTimezone(timezone, reference);
  const outsideHour = (hour + 12) % 24;
  const padded = String(outsideHour).padStart(2, "0");
  return { start: `${padded}:00`, end: `${padded}:59` };
}

function businessHoursIncludingNow(timezone: string, reference = new Date()): {
  start: string;
  end: string;
} {
  const hour = getHourInTimezone(timezone, reference);
  const startHour = Math.max(0, hour - 1);
  const endHour = Math.min(23, hour + 1);
  return {
    start: `${String(startHour).padStart(2, "0")}:00`,
    end: `${String(endHour).padStart(2, "0")}:59`,
  };
}

describe.skipIf(!hasDb)("billing automation backend", () => {
  const runIds: string[] = [];
  const deliveryDedupeKeys: string[] = [];
  const billingAccountKeys: string[] = [];

  afterAll(async () => {
    if (billingAccountKeys.length > 0) {
      await prisma.billingBusinessAccount.deleteMany({
        where: { businessKey: { in: billingAccountKeys } },
      });
    }
    if (deliveryDedupeKeys.length > 0) {
      await prisma.automationDeliveryLog.deleteMany({
        where: { dedupeKey: { in: deliveryDedupeKeys } },
      });
    }
    if (runIds.length > 0) {
      await prisma.automationRunLog.deleteMany({ where: { id: { in: runIds } } });
    }
    await updateAutomationConfig({ global: { enabled: false, dryRunMode: false } });
    resetAutomationConfigCacheForTests();
    await prisma.$disconnect();
  });

  it("EC-BE-001: skips CRON run when automation is disabled globally", async () => {
    await updateAutomationConfig({ global: { enabled: false } });
    resetAutomationConfigCacheForTests();

    const config = await getAutomationConfig({ fresh: true });
    expect(config.global.enabled).toBe(false);

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(result.errors).toEqual([]);
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.summary.invoicesSkipped).toBe(0);
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.summary.whatsAppQueued).toBe(0);
    expect(result.summary.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "skipped",
          status: "skipped",
          message: "Automations are disabled in Automation Center",
        }),
      ]),
    );

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");
    expect(runLog.trigger).toBe("CRON");
  });

  it("EC-BE-002: dry-run mode previews without sending or delivery logs", async () => {
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([]);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: true },
      invoices: { autoSendEnabled: true },
      paymentReminders: { enabled: true },
    });
    resetAutomationConfigCacheForTests();

    const deliveryCountBefore = await prisma.automationDeliveryLog.count();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    const deliveryCountAfter = await prisma.automationDeliveryLog.count();

    expect(result.errors).toEqual([]);
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.summary.whatsAppQueued).toBe(0);
    expect(deliveryCountAfter).toBe(deliveryCountBefore);

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.trigger).toBe("DRY_RUN");
    expect(runLog.status).toBe("SUCCESS");

    for (const detail of result.summary.details) {
      expect(detail.status).not.toBe("success");
      if (detail.action !== "skipped") {
        expect(detail.status).toBe("queued");
      }
    }

    storesSpy.mockRestore();
  });

  it("EC-BE-003: skips invoice automation when SMTP is not configured", async () => {
    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false },
      invoices: { autoSendEnabled: true },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(result.summary.invoicesSent).toBe(0);
    expect(result.errors).toContain(
      "SMTP is not configured — invoice automation skipped.",
    );

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.trigger).toBe("CRON");
    expect(runLog.status).toBe("FAILED");
    expect(runLog.errors).toContain(
      "SMTP is not configured — invoice automation skipped.",
    );

    smtpSpy.mockRestore();
  });

  it("EC-BE-004: returns 503 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");

    const response = await getBillingAutomationCron(
      new Request("http://localhost/api/cron/billing-automation"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "CRON_SECRET is not configured.",
    });

    vi.unstubAllEnvs();
  });

  it("EC-BE-005: returns 401 when cron auth is wrong or missing", async () => {
    vi.stubEnv("CRON_SECRET", "vitest-cron-secret-ec-be-005");

    const wrongAuthResponse = await getBillingAutomationCron(
      new Request("http://localhost/api/cron/billing-automation", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );
    expect(wrongAuthResponse.status).toBe(401);
    await expect(wrongAuthResponse.json()).resolves.toEqual({
      message: "Unauthorized",
    });

    const missingAuthResponse = await getBillingAutomationCron(
      new Request("http://localhost/api/cron/billing-automation"),
    );
    expect(missingAuthResponse.status).toBe(401);
    await expect(missingAuthResponse.json()).resolves.toEqual({
      message: "Unauthorized",
    });

    vi.unstubAllEnvs();
  });

  it("EC-BE-006: marks run PARTIAL when some invoice sends succeed and others fail", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const emailA = `partial-a-${runId}@test.local`;
    const emailB = `partial-b-${runId}@test.local`;

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-a-${runId}`, ownerEmail: emailA }),
        makePortfolioStore({ storeId: `store-b-${runId}`, ownerEmail: emailB }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockImplementation(async (businessKey) => {
        if (businessKey === emailA) {
          return {
            invoiceNumber: `INV-PARTIAL-${runId}`,
            sentTo: emailA,
            grandTotal: 1_000,
          };
        }
        throw new Error("Simulated invoice send failure");
      });

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: { autoSendEnabled: true, sendDayOfMonth: invoiceDay, skipIfPaid: true },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    // Some actions succeed
    expect(result.summary.invoicesSent).toBe(1);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === emailA &&
          detail.status === "success",
      ),
    ).toBe(true);

    // Some actions fail
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((message) => message.includes("Simulated invoice send failure"))).toBe(
      true,
    );
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === emailB &&
          detail.status === "failed",
      ),
    ).toBe(true);

    // Run status is PARTIAL (not SUCCESS or FAILED)
    expect(result.status).toBe("PARTIAL");
    expect(result.status).not.toBe("SUCCESS");
    expect(result.status).not.toBe("FAILED");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("PARTIAL");
    expect(runLog.status).not.toBe("SUCCESS");
    expect(runLog.status).not.toBe("FAILED");
    expect(runLog.errors).toEqual(expect.arrayContaining(result.errors));

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-007: marks run FAILED when all invoice sends fail", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const emailA = `failed-a-${runId}@test.local`;
    const emailB = `failed-b-${runId}@test.local`;

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-a-${runId}`, ownerEmail: emailA }),
        makePortfolioStore({ storeId: `store-b-${runId}`, ownerEmail: emailB }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockRejectedValue(new Error("Simulated total invoice failure"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: { autoSendEnabled: true, sendDayOfMonth: invoiceDay, skipIfPaid: true },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    // All actions fail — no successful sends
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(
      result.errors.every((message) => message.includes("Simulated total invoice failure")),
    ).toBe(true);
    expect(result.summary.details.filter((detail) => detail.status === "success")).toEqual([]);
    expect(
      result.summary.details.filter(
        (detail) => detail.action === "invoice" && detail.status === "failed",
      ),
    ).toHaveLength(2);

    // Run status is FAILED (not SUCCESS or PARTIAL)
    expect(result.status).toBe("FAILED");
    expect(result.status).not.toBe("SUCCESS");
    expect(result.status).not.toBe("PARTIAL");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("FAILED");
    expect(runLog.status).not.toBe("SUCCESS");
    expect(runLog.status).not.toBe("PARTIAL");
    expect(runLog.errors).toEqual(expect.arrayContaining(result.errors));

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-008: skips invoice send when today is not the configured invoice day", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `skip-day-${runId}@test.local`;

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockRejectedValue(new Error("Should not send invoice on non-invoice day"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
        skipIfPaid: true,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    expect(notInvoiceDay).not.toBe(today);

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(invoiceSpy).not.toHaveBeenCalled();
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.summary.invoicesSkipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "invoice"),
    ).toEqual([]);

    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-009: sends renewal-based invoice on days-before-renewal schedule", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const daysBeforeRenewal = 3;
    const email = `renewal-${runId}@test.local`;
    const renewalDueAt = addCalendarDays(new Date(), daysBeforeRenewal);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt,
        }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockResolvedValue({
        invoiceNumber: `INV-RENEWAL-${runId}`,
        sentTo: email,
        grandTotal: 2_500,
      });

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: true,
        daysBeforeRenewal,
        skipIfPaid: true,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    expect(notInvoiceDay).not.toBe(today);

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(invoiceSpy).toHaveBeenCalledOnce();
    expect(invoiceSpy).toHaveBeenCalledWith(email, "automation@fineset.local");
    expect(result.summary.invoicesSent).toBe(1);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === email &&
          detail.status === "success" &&
          detail.message === `Renewal due in ${daysBeforeRenewal} day(s)`,
      ),
    ).toBe(true);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-010: skips invoice when skipIfPaid is enabled and business is CURRENT", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const email = `paid-${runId}@test.local`;
    const billingAnchorAt = new Date();
    billingAnchorAt.setDate(1);
    billingAnchorAt.setHours(0, 0, 0, 0);

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Paid Test Business",
        businessEmail: email,
        paymentStatus: "PAID",
        paidAt: new Date(),
        billingAnchorAt,
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
        }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockRejectedValue(new Error("Should not send invoice for CURRENT business"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: invoiceDay,
        sendOnRenewalDue: false,
        skipIfPaid: true,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(invoiceSpy).not.toHaveBeenCalled();
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.summary.invoicesSkipped).toBe(1);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === email &&
          detail.status === "skipped" &&
          detail.message === "Already paid for current cycle",
      ),
    ).toBe(true);
    expect(result.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-011: skips invoice when business has no email", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const storeId = `store-${runId}`;

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId, ownerEmail: "   " }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockRejectedValue(new Error("Should not send invoice without business email"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: invoiceDay,
        sendOnRenewalDue: false,
        skipIfPaid: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(invoiceSpy).not.toHaveBeenCalled();
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.summary.invoicesSkipped).toBe(1);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === `store:${storeId}` &&
          detail.status === "skipped" &&
          detail.message === "No business email",
      ),
    ).toBe(true);
    expect(result.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-012: skips duplicate invoice send in the same billing cycle", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const email = `dedupe-${runId}@test.local`;
    const scheduleReason = `Scheduled invoice day (${invoiceDay})`;
    const dedupeKey = buildAutomationDedupeKey([
      email,
      "INVOICE",
      billingCycleMonthKeyInTimezone(timezone),
      scheduleReason,
    ]);
    deliveryDedupeKeys.push(dedupeKey);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockResolvedValue({
        invoiceNumber: `INV-DEDUPE-${runId}`,
        sentTo: email,
        grandTotal: 1_500,
      });

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: invoiceDay,
        sendOnRenewalDue: false,
        skipIfPaid: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const firstRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(firstRun.runId);

    const secondRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(secondRun.runId);

    expect(invoiceSpy).toHaveBeenCalledOnce();
    expect(firstRun.summary.invoicesSent).toBe(1);
    expect(secondRun.summary.invoicesSent).toBe(0);
    expect(secondRun.errors).toEqual([]);
    expect(
      secondRun.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === email &&
          detail.status === "skipped" &&
          detail.message === "Already sent for this billing period",
      ),
    ).toBe(true);
    expect(secondRun.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-013: logs per-business invoice failure and continues for other businesses", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const emailA = `throws-a-${runId}@test.local`;
    const emailB = `throws-b-${runId}@test.local`;

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-a-${runId}`, ownerEmail: emailA }),
        makePortfolioStore({ storeId: `store-b-${runId}`, ownerEmail: emailB }),
      ]);
    const invoiceSpy = vi
      .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
      .mockImplementation(async (businessKey) => {
        if (businessKey === emailA) {
          throw new Error("Simulated invoice send failure");
        }
        return {
          invoiceNumber: `INV-CONT-${runId}`,
          sentTo: emailB,
          grandTotal: 900,
        };
      });

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: invoiceDay,
        sendOnRenewalDue: false,
        skipIfPaid: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(invoiceSpy).toHaveBeenCalledTimes(2);
    expect(result.summary.invoicesSent).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Simulated invoice send failure");
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === emailA &&
          detail.status === "failed",
      ),
    ).toBe(true);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === emailB &&
          detail.status === "success",
      ),
    ).toBe(true);
    expect(result.status).toBe("PARTIAL");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    invoiceSpy.mockRestore();
  });

  it("EC-BE-014: marks invoice failure when billing invoice number pool is exhausted", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const invoiceDay = getDayOfMonthInTimezone(timezone);
    const email = `pool-${runId}@test.local`;
    const poolError = new billingAccountsModule.BillingAccountError(
      "Invoice number pool exhausted for today.",
      500,
    );

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);
    const allocateSpy = vi
      .spyOn(billingAccountsModule, "allocateInvoiceNumber")
      .mockRejectedValue(poolError);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: true,
        sendDayOfMonth: invoiceDay,
        sendOnRenewalDue: false,
        skipIfPaid: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(allocateSpy).toHaveBeenCalled();
    expect(poolError.status).toBe(500);
    expect(result.summary.invoicesSent).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Invoice number pool exhausted for today.");
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "invoice" &&
          detail.businessKey === email &&
          detail.status === "failed" &&
          detail.message === "Invoice number pool exhausted for today.",
      ),
    ).toBe(true);
    expect(result.status).toBe("FAILED");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("FAILED");
    expect(runLog.errors).toEqual(expect.arrayContaining(result.errors));

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    allocateSpy.mockRestore();
  });

  it("EC-BE-015: skips payment reminders when today is not a configured before/after due day", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `reminder-skip-${runId}@test.local`;
    const reference = new Date();
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [99],
        reminderDaysAfterDue: [99],
        maxRemindersPerCycle: 5,
        stopAfterPayment: false,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);

    expect(automationConfig.paymentReminders.reminderDaysBeforeDue).not.toContain(daysUntilDue);
    if (daysUntilDue < 0) {
      expect(automationConfig.paymentReminders.reminderDaysAfterDue).not.toContain(
        Math.abs(daysUntilDue),
      );
    }

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);
    const reminderSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentReminderEmail")
      .mockRejectedValue(new Error("Should not send payment reminder today"));

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reminderSpy).not.toHaveBeenCalled();
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.summary.whatsAppQueued).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "payment_reminder"),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reminderSpy.mockRestore();
  });

  it("EC-BE-016: skips payment reminders when stopAfterPayment and business is PAID or WAIVED", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const emailPaid = `paid-reminder-${runId}@test.local`;
    const emailWaived = `waived-reminder-${runId}@test.local`;
    const reference = new Date();
    const billingAnchorAt = new Date();
    billingAnchorAt.setDate(1);
    billingAnchorAt.setHours(0, 0, 0, 0);
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle: 5,
        stopAfterPayment: true,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }

    billingAccountKeys.push(emailPaid, emailWaived);
    await prisma.billingBusinessAccount.createMany({
      data: [
        {
          businessKey: emailPaid,
          businessName: "Paid Reminder Test",
          businessEmail: emailPaid,
          paymentStatus: "PAID",
          paidAt: new Date(),
          billingAnchorAt,
        },
        {
          businessKey: emailWaived,
          businessName: "Waived Reminder Test",
          businessEmail: emailWaived,
          paymentStatus: "WAIVED",
          billingAnchorAt,
        },
      ],
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-paid-${runId}`,
          ownerEmail: emailPaid,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
        makePortfolioStore({
          storeId: `store-waived-${runId}`,
          ownerEmail: emailWaived,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);
    const reminderSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentReminderEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(
      automationConfig.paymentReminders.reminderDaysBeforeDue.length +
        automationConfig.paymentReminders.reminderDaysAfterDue.length,
    ).toBeGreaterThan(0);
    expect(reminderSpy).not.toHaveBeenCalled();
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.summary.whatsAppQueued).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "payment_reminder"),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reminderSpy.mockRestore();
  });

  it("EC-BE-017: skips payment reminders when portfolio payment status is CURRENT", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `current-reminder-${runId}@test.local`;
    const reference = new Date();
    const billingAnchorAt = new Date();
    billingAnchorAt.setDate(1);
    billingAnchorAt.setHours(0, 0, 0, 0);
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle: 5,
        stopAfterPayment: false,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Current Portfolio Test",
        businessEmail: email,
        paymentStatus: "PAID",
        paidAt: new Date(),
        billingAnchorAt,
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, 30),
        }),
      ]);
    const reminderSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentReminderEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(
      automationConfig.paymentReminders.reminderDaysBeforeDue.length +
        automationConfig.paymentReminders.reminderDaysAfterDue.length,
    ).toBeGreaterThan(0);
    expect(reminderSpy).not.toHaveBeenCalled();
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "payment_reminder"),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reminderSpy.mockRestore();
  });

  it("EC-BE-018: skips payment reminders when max reminders per cycle is reached", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `max-reminder-${runId}@test.local`;
    const reference = new Date();
    const maxRemindersPerCycle = 2;
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle,
        stopAfterPayment: false,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }
    const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);
    const seededDedupeKeys = [
      buildAutomationDedupeKey([email, "PAYMENT_REMINDER", cycleKey, "seed_1"]),
      buildAutomationDedupeKey([email, "PAYMENT_REMINDER", cycleKey, "seed_2"]),
    ];
    deliveryDedupeKeys.push(...seededDedupeKeys);

    await prisma.automationDeliveryLog.createMany({
      data: seededDedupeKeys.map((dedupeKey) => ({
        businessKey: email,
        actionType: "PAYMENT_REMINDER",
        dedupeKey,
        channel: "EMAIL",
        status: "SUCCESS",
      })),
    });

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Max Reminder Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);
    const reminderSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentReminderEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reminderSpy).not.toHaveBeenCalled();
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "payment_reminder" &&
          detail.businessKey === email &&
          detail.status === "skipped" &&
          detail.message === "Max reminders reached for this cycle",
      ),
    ).toBe(true);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reminderSpy.mockRestore();
  });

  it("EC-BE-019: skips duplicate payment reminder in the same billing cycle", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `reminder-dedupe-${runId}@test.local`;
    const reference = new Date();
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle: 5,
        stopAfterPayment: false,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }
    const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);
    const variant =
      daysUntilDue >= 0 ? `before_${daysUntilDue}` : `after_${Math.abs(daysUntilDue)}`;
    deliveryDedupeKeys.push(
      buildAutomationDedupeKey([email, "PAYMENT_REMINDER", cycleKey, variant]),
    );

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Reminder Dedupe Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);
    const reminderSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentReminderEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const firstRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(firstRun.runId);

    const secondRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(secondRun.runId);

    expect(reminderSpy).toHaveBeenCalledOnce();
    expect(firstRun.summary.paymentRemindersSent).toBe(1);
    expect(secondRun.summary.paymentRemindersSent).toBe(0);
    expect(secondRun.errors).toEqual([]);
    expect(
      secondRun.summary.details.some(
        (detail) =>
          detail.action === "payment_reminder" &&
          detail.businessKey === email &&
          detail.status === "skipped" &&
          detail.message === "Already sent for this billing period",
      ),
    ).toBe(true);
    expect(secondRun.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reminderSpy.mockRestore();
  });

  it("EC-BE-020: skips payment reminder emails when SMTP is not configured", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `smtp-reminder-${runId}@test.local`;
    const reference = new Date();
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: true,
        whatsAppEnabled: false,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle: 5,
        stopAfterPayment: false,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);
    const reminderSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentReminderEmail")
      .mockResolvedValue(undefined);

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "SMTP Reminder Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
      },
    });

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reminderSpy).not.toHaveBeenCalled();
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.errors).toContain(
      "SMTP is not configured — payment reminder emails were skipped.",
    );
    expect(result.status).toBe("FAILED");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("FAILED");
    expect(runLog.errors).toContain(
      "SMTP is not configured — payment reminder emails were skipped.",
    );

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reminderSpy.mockRestore();
  });

  it("EC-BE-021: skips WhatsApp payment reminders outside configured business hours", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `whatsapp-hours-${runId}@test.local`;
    const reference = new Date();
    const outsideHours = businessHoursOutsideNow(timezone, reference);
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: false,
        whatsAppEnabled: true,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle: 5,
        stopAfterPayment: false,
      },
      whatsApp: {
        enabled: true,
        businessHoursOnly: true,
        businessHoursStart: outsideHours.start,
        businessHoursEnd: outsideHours.end,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }

    expect(
      isWithinBusinessHoursInTimezone(
        timezone,
        outsideHours.start,
        outsideHours.end,
        reference,
      ),
    ).toBe(false);

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "WhatsApp Hours Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
      },
    });

    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);
    const followUpSpy = vi.spyOn(billingAccountsModule, "createBillingFollowUp");

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(followUpSpy).not.toHaveBeenCalled();
    expect(result.summary.whatsAppQueued).toBe(0);
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "whatsapp_reminder"),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    storesSpy.mockRestore();
    followUpSpy.mockRestore();
  });

  it("EC-BE-022: queues WhatsApp billing follow-up during payment reminder automation", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `whatsapp-queue-${runId}@test.local`;
    const reference = new Date();
    const insideHours = businessHoursIncludingNow(timezone, reference);
    const automationConfig = {
      global: { enabled: true, dryRunMode: false, timezone },
      billingCycle: { cycleStartDay: 1, paymentDueDay: 10, gracePeriodDays: 10 },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: {
        enabled: true,
        emailEnabled: false,
        whatsAppEnabled: true,
        reminderDaysBeforeDue: [] as number[],
        reminderDaysAfterDue: [] as number[],
        maxRemindersPerCycle: 5,
        stopAfterPayment: false,
      },
      whatsApp: {
        enabled: true,
        businessHoursOnly: true,
        businessHoursStart: insideHours.start,
        businessHoursEnd: insideHours.end,
      },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    };
    const cycleSettings = toBillingCycleSettings(mergeAutomationConfig(automationConfig));
    const daysUntilDue = daysUntilPaymentDeadline(reference, cycleSettings);
    if (daysUntilDue >= 0) {
      automationConfig.paymentReminders.reminderDaysBeforeDue = [daysUntilDue];
    } else {
      automationConfig.paymentReminders.reminderDaysAfterDue = [Math.abs(daysUntilDue)];
    }
    const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);
    const variant =
      daysUntilDue >= 0 ? `before_${daysUntilDue}` : `after_${Math.abs(daysUntilDue)}`;
    deliveryDedupeKeys.push(
      buildAutomationDedupeKey([email, "WHATSAPP_REMINDER", cycleKey, variant]),
    );

    expect(
      isWithinBusinessHoursInTimezone(
        timezone,
        insideHours.start,
        insideHours.end,
        reference,
      ),
    ).toBe(true);

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "WhatsApp Queue Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
      },
    });

    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(reference, -14),
        }),
      ]);

    await updateAutomationConfig(automationConfig);
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    const followUp = await prisma.billingFollowUp.findFirst({
      where: { account: { businessKey: email }, channel: "WHATSAPP" },
    });

    expect(result.summary.whatsAppQueued).toBe(1);
    expect(result.summary.paymentRemindersSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "whatsapp_reminder" &&
          detail.businessKey === email &&
          detail.channel === "WHATSAPP" &&
          detail.status === "success" &&
          detail.message === "Follow-up scheduled — send from Billing",
      ),
    ).toBe(true);
    expect(followUp).not.toBeNull();
    expect(followUp?.outcome).toBe("RESCHEDULED");
    expect(followUp?.notes).toContain("[Automation] WhatsApp reminder queued.");
    expect(result.status).toBe("SUCCESS");

    storesSpy.mockRestore();
  });

  it("EC-BE-023: auto-schedules next follow-up when nextFollowUpAt is due", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `followup-due-${runId}@test.local`;
    const spacingDays = 2;
    const dueFollowUpAt = new Date();
    dueFollowUpAt.setDate(dueFollowUpAt.getDate() - 1);

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Follow Up Due Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
        nextFollowUpAt: dueFollowUpAt,
      },
    });

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: {
        enabled: true,
        autoScheduleNext: true,
        maxFollowUps: 5,
        spacingDays: [spacingDays, 3, 5, 7, 7],
        defaultChannel: "EMAIL",
        escalateAfterMax: false,
      },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    const account = await prisma.billingBusinessAccount.findUniqueOrThrow({
      where: { businessKey: email },
    });
    const followUps = await prisma.billingFollowUp.findMany({
      where: { account: { businessKey: email } },
      orderBy: { createdAt: "desc" },
    });

    expect(result.summary.followUpsScheduled).toBe(1);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "follow_up_schedule" &&
          detail.businessKey === email &&
          detail.channel === "EMAIL" &&
          detail.status === "success",
      ),
    ).toBe(true);
    expect(followUps).toHaveLength(1);
    expect(followUps[0]?.outcome).toBe("RESCHEDULED");
    expect(followUps[0]?.notes).toBe("[Automation] Scheduled follow-up reminder.");
    expect(account.nextFollowUpAt).not.toBeNull();
    expect(account.lastFollowUpAt).not.toBeNull();
    expect(result.status).toBe("SUCCESS");
  });

  it("EC-BE-024: skips auto-schedule and records escalation when max follow-ups reached", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `followup-max-${runId}@test.local`;
    const maxFollowUps = 2;
    const dueFollowUpAt = new Date();
    dueFollowUpAt.setDate(dueFollowUpAt.getDate() - 1);

    billingAccountKeys.push(email);
    const account = await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Follow Up Max Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
        nextFollowUpAt: dueFollowUpAt,
      },
    });

    for (let index = 0; index < maxFollowUps; index += 1) {
      await prisma.billingFollowUp.create({
        data: {
          accountId: account.id,
          channel: "EMAIL",
          outcome: "RESCHEDULED",
          notes: `[Test] Existing follow-up ${index + 1}`,
        },
      });
    }

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: {
        enabled: true,
        autoScheduleNext: true,
        maxFollowUps,
        spacingDays: [2, 3, 5, 7, 7],
        defaultChannel: "EMAIL",
        escalateAfterMax: true,
      },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    const followUps = await prisma.billingFollowUp.findMany({
      where: { account: { businessKey: email } },
    });

    expect(result.summary.followUpsScheduled).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "follow_up_escalation" &&
          detail.businessKey === email &&
          detail.status === "skipped" &&
          detail.message === "Max follow-ups reached — needs manual review",
      ),
    ).toBe(true);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.action === "follow_up_schedule" && detail.businessKey === email,
      ),
    ).toBe(false);
    expect(followUps).toHaveLength(maxFollowUps);
    expect(result.status).toBe("SUCCESS");
  });

  it("EC-BE-025: uses last spacing value when spacing array is shorter than follow-up count", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `followup-spacing-${runId}@test.local`;
    const existingFollowUps = 3;
    const spacingDays = [2, 7];
    const expectedSpacing = spacingDays[spacingDays.length - 1]!;
    const dueFollowUpAt = new Date();
    dueFollowUpAt.setDate(dueFollowUpAt.getDate() - 1);

    billingAccountKeys.push(email);
    const account = await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Follow Up Spacing Test",
        businessEmail: email,
        paymentStatus: "UNPAID",
        nextFollowUpAt: dueFollowUpAt,
      },
    });

    for (let index = 0; index < existingFollowUps; index += 1) {
      await prisma.billingFollowUp.create({
        data: {
          accountId: account.id,
          channel: "EMAIL",
          outcome: "RESCHEDULED",
          notes: `[Test] Existing follow-up ${index + 1}`,
        },
      });
    }

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: {
        enabled: true,
        autoScheduleNext: true,
        maxFollowUps: 10,
        spacingDays,
        defaultChannel: "EMAIL",
        escalateAfterMax: false,
      },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    const updatedAccount = await prisma.billingBusinessAccount.findUniqueOrThrow({
      where: { businessKey: email },
    });
    const scheduledFollowUp = await prisma.billingFollowUp.findFirst({
      where: {
        account: { businessKey: email },
        notes: "[Automation] Scheduled follow-up reminder.",
      },
      orderBy: { createdAt: "desc" },
    });
    const expectedNextDate = new Date();
    expectedNextDate.setDate(expectedNextDate.getDate() + expectedSpacing);

    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter(
        (detail) =>
          detail.action === "follow_up_schedule" &&
          detail.businessKey === email &&
          detail.status === "success",
      ),
    ).toHaveLength(1);
    expect(scheduledFollowUp?.nextFollowUpAt).not.toBeNull();
    expect(updatedAccount.nextFollowUpAt).not.toBeNull();
    expect(scheduledFollowUp!.nextFollowUpAt!.toISOString().slice(0, 10)).toBe(
      expectedNextDate.toISOString().slice(0, 10),
    );
    expect(updatedAccount.nextFollowUpAt!.toISOString().slice(0, 10)).toBe(
      expectedNextDate.toISOString().slice(0, 10),
    );
    expect(result.status).toBe("SUCCESS");
  });

  it("EC-BE-026: skips expiry and renewal reminders when business has no email", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const storeId = `store-${runId}`;
    const businessKey = `store:${storeId}`;
    const daysBeforeRenewal = 7;
    const daysBeforeExpiry = 7;
    const renewalDueAt = addCalendarDays(new Date(), daysBeforeRenewal);
    const dataExpiryAt = addCalendarDays(new Date(), daysBeforeExpiry);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId,
          ownerEmail: "   ",
          renewalDueAt,
          dataExpiryAt,
        }),
      ]);
    const renewalSpy = vi
      .spyOn(automationEmailsModule, "sendRenewalReminderEmail")
      .mockRejectedValue(new Error("Should not send renewal reminder without business email"));
    const expirySpy = vi
      .spyOn(automationEmailsModule, "sendExpiryWarningEmail")
      .mockRejectedValue(new Error("Should not send expiry warning without business email"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        renewalReminderEnabled: true,
        renewalReminderDaysBefore: [daysBeforeRenewal],
        expiryReminderEnabled: true,
        expiryWarningDaysBefore: [daysBeforeExpiry],
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(renewalSpy).not.toHaveBeenCalled();
    expect(expirySpy).not.toHaveBeenCalled();
    expect(result.summary.renewalRemindersSent).toBe(0);
    expect(result.summary.expiryWarningsSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.some(
        (detail) =>
          detail.businessKey === businessKey &&
          (detail.action === "renewal_reminder" || detail.action === "expiry_warning"),
      ),
    ).toBe(false);
    expect(result.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    renewalSpy.mockRestore();
    expirySpy.mockRestore();
  });

  it("EC-BE-027: skips renewal and expiry reminders when dates are not on configured days-before", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `expiry-skip-${runId}@test.local`;
    const reference = new Date();
    const daysUntilRenewal = 7;
    const daysUntilExpiry = 5;
    const renewalDueAt = addCalendarDays(reference, daysUntilRenewal);
    const dataExpiryAt = addCalendarDays(reference, daysUntilExpiry);
    const renewalReminderDaysBefore = [99];
    const expiryWarningDaysBefore = [99];

    expect(renewalReminderDaysBefore).not.toContain(daysUntilRenewal);
    expect(expiryWarningDaysBefore).not.toContain(daysUntilExpiry);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt,
          dataExpiryAt,
        }),
      ]);
    const renewalSpy = vi
      .spyOn(automationEmailsModule, "sendRenewalReminderEmail")
      .mockRejectedValue(new Error("Should not send renewal reminder today"));
    const expirySpy = vi
      .spyOn(automationEmailsModule, "sendExpiryWarningEmail")
      .mockRejectedValue(new Error("Should not send expiry warning today"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        renewalReminderEnabled: true,
        renewalReminderDaysBefore,
        expiryReminderEnabled: true,
        expiryWarningDaysBefore,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(renewalSpy).not.toHaveBeenCalled();
    expect(expirySpy).not.toHaveBeenCalled();
    expect(result.summary.renewalRemindersSent).toBe(0);
    expect(result.summary.expiryWarningsSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter(
        (detail) =>
          detail.action === "renewal_reminder" || detail.action === "expiry_warning",
      ),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    renewalSpy.mockRestore();
    expirySpy.mockRestore();
  });

  it("EC-BE-028: skips duplicate renewal and expiry reminders in the same billing cycle", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const renewalEmail = `renewal-dedupe-${runId}@test.local`;
    const expiryEmail = `expiry-dedupe-${runId}@test.local`;
    const reference = new Date();
    const daysUntilRenewal = 7;
    const daysUntilExpiry = 3;
    const renewalDueAt = addCalendarDays(reference, daysUntilRenewal);
    const dataExpiryAt = addCalendarDays(reference, daysUntilExpiry);
    const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);

    deliveryDedupeKeys.push(
      buildAutomationDedupeKey([
        renewalEmail,
        "RENEWAL_REMINDER",
        cycleKey,
        String(daysUntilRenewal),
      ]),
      buildAutomationDedupeKey([
        expiryEmail,
        "EXPIRY_WARNING",
        cycleKey,
        String(daysUntilExpiry),
      ]),
    );

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `renewal-${runId}`,
          ownerEmail: renewalEmail,
          renewalDueAt,
        }),
        makePortfolioStore({
          storeId: `expiry-${runId}`,
          ownerEmail: expiryEmail,
          dataExpiryAt,
        }),
      ]);
    const renewalSpy = vi
      .spyOn(automationEmailsModule, "sendRenewalReminderEmail")
      .mockResolvedValue(undefined);
    const expirySpy = vi
      .spyOn(automationEmailsModule, "sendExpiryWarningEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        renewalReminderEnabled: true,
        renewalReminderDaysBefore: [daysUntilRenewal],
        expiryReminderEnabled: true,
        expiryWarningDaysBefore: [daysUntilExpiry],
      },
    });
    resetAutomationConfigCacheForTests();

    const firstRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(firstRun.runId);

    const secondRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(secondRun.runId);

    expect(renewalSpy).toHaveBeenCalledOnce();
    expect(expirySpy).toHaveBeenCalledOnce();
    expect(firstRun.summary.renewalRemindersSent).toBe(1);
    expect(firstRun.summary.expiryWarningsSent).toBe(1);
    expect(secondRun.summary.renewalRemindersSent).toBe(0);
    expect(secondRun.summary.expiryWarningsSent).toBe(0);
    expect(secondRun.errors).toEqual([]);
    expect(
      secondRun.summary.details.some(
        (detail) =>
          detail.action === "renewal_reminder" &&
          detail.businessKey === renewalEmail &&
          detail.status === "skipped" &&
          detail.message === "Already sent for this billing period",
      ),
    ).toBe(true);
    expect(
      secondRun.summary.details.some(
        (detail) =>
          detail.action === "expiry_warning" &&
          detail.businessKey === expiryEmail &&
          detail.status === "skipped" &&
          detail.message === "Already sent for this billing period",
      ),
    ).toBe(true);
    expect(secondRun.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    renewalSpy.mockRestore();
    expirySpy.mockRestore();
  });

  it("EC-BE-029: skips renewal and expiry reminders with errors when SMTP is not configured", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notInvoiceDay = today <= 15 ? 28 : 1;
    const email = `smtp-expiry-${runId}@test.local`;
    const reference = new Date();
    const daysUntilRenewal = 7;
    const daysUntilExpiry = 3;
    const renewalDueAt = addCalendarDays(reference, daysUntilRenewal);
    const dataExpiryAt = addCalendarDays(reference, daysUntilExpiry);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt,
          dataExpiryAt,
        }),
      ]);
    const renewalSpy = vi
      .spyOn(automationEmailsModule, "sendRenewalReminderEmail")
      .mockResolvedValue(undefined);
    const expirySpy = vi
      .spyOn(automationEmailsModule, "sendExpiryWarningEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notInvoiceDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      monthlyReports: { enabled: false },
      expiryRenewal: {
        renewalReminderEnabled: true,
        renewalReminderDaysBefore: [daysUntilRenewal],
        expiryReminderEnabled: true,
        expiryWarningDaysBefore: [daysUntilExpiry],
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(renewalSpy).not.toHaveBeenCalled();
    expect(expirySpy).not.toHaveBeenCalled();
    expect(result.summary.renewalRemindersSent).toBe(0);
    expect(result.summary.expiryWarningsSent).toBe(0);
    expect(result.errors).toContain(
      "SMTP is not configured — renewal reminders were skipped.",
    );
    expect(result.errors).toContain(
      "SMTP is not configured — expiry warnings were skipped.",
    );
    expect(result.status).toBe("FAILED");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("FAILED");
    expect(runLog.errors).toContain(
      "SMTP is not configured — renewal reminders were skipped.",
    );
    expect(runLog.errors).toContain(
      "SMTP is not configured — expiry warnings were skipped.",
    );

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    renewalSpy.mockRestore();
    expirySpy.mockRestore();
  });

  it("EC-BE-030: skips monthly reports when today is not the configured report day", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const notReportDay = today <= 15 ? 28 : 1;
    const email = `report-skip-day-${runId}@test.local`;

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);
    const reportSpy = vi
      .spyOn(automationEmailsModule, "sendMonthlyReportEmail")
      .mockRejectedValue(new Error("Should not send monthly report on non-report day"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: notReportDay,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
      monthlyReports: {
        enabled: true,
        sendDayOfMonth: notReportDay,
        sendHourLocal: 9,
        recipients: "business_owners",
        includePortfolioSummary: true,
        includePerStoreMetrics: true,
        includeBillingSummary: true,
      },
    });
    resetAutomationConfigCacheForTests();

    expect(notReportDay).not.toBe(today);

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reportSpy).not.toHaveBeenCalled();
    expect(result.summary.monthlyReportsSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "monthly_report"),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reportSpy.mockRestore();
  });

  it("EC-BE-031: skips monthly reports when current local hour is not configured", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const currentHour = getHourInTimezone(timezone);
    const notReportHour = (currentHour + 12) % 24;
    const email = `report-skip-hour-${runId}@test.local`;

    expect(notReportHour).not.toBe(currentHour);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);
    const reportSpy = vi
      .spyOn(automationEmailsModule, "sendMonthlyReportEmail")
      .mockRejectedValue(new Error("Should not send monthly report outside report hour"));

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: today,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
      monthlyReports: {
        enabled: true,
        sendDayOfMonth: today,
        sendHourLocal: notReportHour,
        recipients: "business_owners",
        includePortfolioSummary: true,
        includePerStoreMetrics: true,
        includeBillingSummary: true,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reportSpy).not.toHaveBeenCalled();
    expect(result.summary.monthlyReportsSent).toBe(0);
    expect(result.errors).toEqual([]);
    expect(
      result.summary.details.filter((detail) => detail.action === "monthly_report"),
    ).toEqual([]);
    expect(result.status).toBe("SUCCESS");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("SUCCESS");

    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reportSpy.mockRestore();
  });

  it("EC-BE-032: sends monthly reports only to configured recipient sets", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const currentHour = getHourInTimezone(timezone);
    const cycleKey = billingCycleMonthKeyInTimezone(timezone);
    const adminEmail = `admin-report-${runId}@test.local`;
    const ownerEmailA = `owner-a-${runId}@test.local`;
    const ownerEmailB = `owner-b-${runId}@test.local`;
    const allRecipients = [adminEmail, ownerEmailA, ownerEmailB];

    vi.stubEnv("MASTER_ADMIN_EMAIL", adminEmail);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-a-${runId}`, ownerEmail: ownerEmailA }),
        makePortfolioStore({ storeId: `store-b-${runId}`, ownerEmail: ownerEmailB }),
      ]);
    const reportSpy = vi
      .spyOn(automationEmailsModule, "sendMonthlyReportEmail")
      .mockResolvedValue(undefined);

    const resetMonthlyReportDedupe = async (emails: string[]) => {
      const dedupeKeys = emails.map((email) =>
        buildAutomationDedupeKey(["MONTHLY_REPORT", cycleKey, email.toLowerCase()]),
      );
      deliveryDedupeKeys.push(...dedupeKeys);
      await prisma.automationDeliveryLog.deleteMany({
        where: { dedupeKey: { in: dedupeKeys } },
      });
    };

    const runMonthlyReports = async (
      recipients: "admin_only" | "business_owners" | "both",
    ) => {
      await updateAutomationConfig({
        global: { enabled: true, dryRunMode: false, timezone },
        invoices: {
          autoSendEnabled: false,
          sendDayOfMonth: today,
          sendOnRenewalDue: false,
        },
        paymentReminders: { enabled: false },
        followUps: { enabled: false, autoScheduleNext: false },
        expiryRenewal: {
          expiryReminderEnabled: false,
          renewalReminderEnabled: false,
        },
        monthlyReports: {
          enabled: true,
          sendDayOfMonth: today,
          sendHourLocal: currentHour,
          recipients,
          includePortfolioSummary: true,
          includePerStoreMetrics: false,
          includeBillingSummary: false,
        },
      });
      resetAutomationConfigCacheForTests();
      reportSpy.mockClear();

      const result = await runBillingAutomation({
        trigger: "CRON",
        triggeredByEmail: "vitest@local",
      });
      runIds.push(result.runId);

      return {
        result,
        recipientsEmailed: reportSpy.mock.calls.map((call) => call[0]?.to).sort(),
      };
    };

    await resetMonthlyReportDedupe([adminEmail]);
    const adminOnly = await runMonthlyReports("admin_only");
    expect(adminOnly.recipientsEmailed).toEqual([adminEmail]);
    expect(adminOnly.result.summary.monthlyReportsSent).toBe(1);
    expect(adminOnly.result.errors).toEqual([]);

    await resetMonthlyReportDedupe([ownerEmailA, ownerEmailB]);
    const ownersOnly = await runMonthlyReports("business_owners");
    expect(ownersOnly.recipientsEmailed).toEqual([ownerEmailA, ownerEmailB].sort());
    expect(ownersOnly.recipientsEmailed).not.toContain(adminEmail);
    expect(ownersOnly.result.summary.monthlyReportsSent).toBe(2);
    expect(ownersOnly.result.errors).toEqual([]);

    await resetMonthlyReportDedupe(allRecipients);
    const both = await runMonthlyReports("both");
    expect(both.recipientsEmailed).toEqual(allRecipients.sort());
    expect(both.result.summary.monthlyReportsSent).toBe(3);
    expect(both.result.errors).toEqual([]);
    expect(both.result.status).toBe("SUCCESS");

    vi.unstubAllEnvs();
    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reportSpy.mockRestore();
  });

  it("EC-BE-033: truncates per-store monthly report metrics after 50 businesses", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const currentHour = getHourInTimezone(timezone);
    const cycleKey = billingCycleMonthKeyInTimezone(timezone);
    const adminEmail = `admin-metrics-${runId}@test.local`;
    const businessCount = 55;
    const allBusinessNames = Array.from(
      { length: businessCount },
      (_, index) => `Trunc Biz ${String(index).padStart(3, "0")}`,
    );

    vi.stubEnv("MASTER_ADMIN_EMAIL", adminEmail);

    const portfolioStores = Array.from({ length: businessCount }, (_, index) =>
      makePortfolioStore({
        storeId: `metrics-${index}-${runId}`,
        storeName: `Trunc Biz ${String(index).padStart(3, "0")}`,
        ownerEmail: `metrics-${index}-${runId}@test.local`,
      }),
    );

    const dedupeKey = buildAutomationDedupeKey([
      "MONTHLY_REPORT",
      cycleKey,
      adminEmail.toLowerCase(),
    ]);
    deliveryDedupeKeys.push(dedupeKey);
    await prisma.automationDeliveryLog.deleteMany({
      where: { dedupeKey },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue(portfolioStores);
    const reportSpy = vi
      .spyOn(automationEmailsModule, "sendMonthlyReportEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: today,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
      monthlyReports: {
        enabled: true,
        sendDayOfMonth: today,
        sendHourLocal: currentHour,
        recipients: "admin_only",
        includePortfolioSummary: true,
        includePerStoreMetrics: true,
        includeBillingSummary: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reportSpy).toHaveBeenCalledOnce();
    const bodyText = reportSpy.mock.calls[0]?.[0]?.bodyText ?? "";
    const metricLines = bodyText
      .split("\n")
      .filter((line) => line.startsWith("• Trunc Biz "));
    const includedBusinessNames = metricLines
      .map((line) => line.match(/^• (.+) — /)?.[1])
      .filter((name): name is string => Boolean(name));
    const excludedBusinessNames = allBusinessNames.filter(
      (name) => !includedBusinessNames.includes(name),
    );

    expect(result.summary.monthlyReportsSent).toBe(1);
    expect(result.errors).toEqual([]);
    expect(bodyText).toContain(`Active businesses: ${businessCount}`);
    expect(bodyText).toContain(`… and ${businessCount - 50} more`);
    expect(metricLines).toHaveLength(50);
    expect(includedBusinessNames).toHaveLength(50);
    expect(excludedBusinessNames).toHaveLength(5);
    expect(result.status).toBe("SUCCESS");

    vi.unstubAllEnvs();
    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reportSpy.mockRestore();
  });

  it("EC-BE-034: skips duplicate monthly report to the same recipient in one cycle", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const currentHour = getHourInTimezone(timezone);
    const cycleKey = billingCycleMonthKeyInTimezone(timezone);
    const adminEmail = `admin-report-dedupe-${runId}@test.local`;
    const dedupeKey = buildAutomationDedupeKey([
      "MONTHLY_REPORT",
      cycleKey,
      adminEmail.toLowerCase(),
    ]);

    deliveryDedupeKeys.push(dedupeKey);
    vi.stubEnv("MASTER_ADMIN_EMAIL", adminEmail);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([]);
    const reportSpy = vi
      .spyOn(automationEmailsModule, "sendMonthlyReportEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: today,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
      monthlyReports: {
        enabled: true,
        sendDayOfMonth: today,
        sendHourLocal: currentHour,
        recipients: "admin_only",
        includePortfolioSummary: true,
        includePerStoreMetrics: false,
        includeBillingSummary: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const firstRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(firstRun.runId);

    const secondRun = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(secondRun.runId);

    expect(reportSpy).toHaveBeenCalledOnce();
    expect(reportSpy).toHaveBeenCalledWith(
      expect.objectContaining({ to: adminEmail }),
    );
    expect(firstRun.summary.monthlyReportsSent).toBe(1);
    expect(secondRun.summary.monthlyReportsSent).toBe(0);
    expect(secondRun.errors).toEqual([]);
    expect(
      secondRun.summary.details.some(
        (detail) =>
          detail.action === "monthly_report" &&
          detail.channel === "EMAIL" &&
          detail.status === "skipped" &&
          detail.message === "Already sent for this billing period",
      ),
    ).toBe(true);
    expect(secondRun.status).toBe("SUCCESS");

    vi.unstubAllEnvs();
    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reportSpy.mockRestore();
  });

  it("EC-BE-035: skips monthly report batch when SMTP is not configured", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const today = getDayOfMonthInTimezone(timezone);
    const currentHour = getHourInTimezone(timezone);
    const adminEmail = `admin-report-smtp-${runId}@test.local`;
    const ownerEmailA = `owner-a-smtp-${runId}@test.local`;
    const ownerEmailB = `owner-b-smtp-${runId}@test.local`;

    vi.stubEnv("MASTER_ADMIN_EMAIL", adminEmail);

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);
    const storesSpy = vi
      .spyOn(storesModule, "getAdminPortfolioStoreRows")
      .mockResolvedValue([
        makePortfolioStore({ storeId: `store-a-${runId}`, ownerEmail: ownerEmailA }),
        makePortfolioStore({ storeId: `store-b-${runId}`, ownerEmail: ownerEmailB }),
      ]);
    const reportSpy = vi
      .spyOn(automationEmailsModule, "sendMonthlyReportEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: {
        autoSendEnabled: false,
        sendDayOfMonth: today,
        sendOnRenewalDue: false,
      },
      paymentReminders: { enabled: false },
      followUps: { enabled: false, autoScheduleNext: false },
      expiryRenewal: {
        expiryReminderEnabled: false,
        renewalReminderEnabled: false,
      },
      monthlyReports: {
        enabled: true,
        sendDayOfMonth: today,
        sendHourLocal: currentHour,
        recipients: "both",
        includePortfolioSummary: true,
        includePerStoreMetrics: false,
        includeBillingSummary: false,
      },
    });
    resetAutomationConfigCacheForTests();

    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "vitest@local",
    });
    runIds.push(result.runId);

    expect(reportSpy).not.toHaveBeenCalled();
    expect(result.summary.monthlyReportsSent).toBe(0);
    expect(result.errors).toEqual([
      "SMTP is not configured — monthly reports were skipped.",
    ]);
    expect(
      result.summary.details.filter((detail) => detail.action === "monthly_report"),
    ).toEqual([]);
    expect(result.status).toBe("FAILED");

    const runLog = await prisma.automationRunLog.findUniqueOrThrow({
      where: { id: result.runId },
    });
    expect(runLog.status).toBe("FAILED");
    expect(runLog.errors).toContain(
      "SMTP is not configured — monthly reports were skipped.",
    );

    vi.unstubAllEnvs();
    smtpSpy.mockRestore();
    storesSpy.mockRestore();
    reportSpy.mockRestore();
  });

  it("EC-BE-036: skips payment confirmation when paymentConfirmationEnabled is false", async () => {
    const runId = randomUUID().slice(0, 8);
    const email = `payment-confirm-off-${runId}@test.local`;

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Payment Confirm Off Test",
        businessEmail: email,
        paymentStatus: "PAID",
        paidAt: new Date(),
        lastInvoiceNumber: `INV-${runId}`,
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const confirmationSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentConfirmationEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false },
      invoices: { paymentConfirmationEnabled: false },
    });
    resetAutomationConfigCacheForTests();

    await sendAutomatedPaymentConfirmation(email);

    expect(confirmationSpy).not.toHaveBeenCalled();

    const delivery = await prisma.automationDeliveryLog.findFirst({
      where: { businessKey: email, actionType: "PAYMENT_CONFIRMATION" },
    });
    expect(delivery).toBeNull();

    smtpSpy.mockRestore();
    confirmationSpy.mockRestore();
  });

  it("EC-BE-037: silently skips payment confirmation when SMTP is not configured", async () => {
    const runId = randomUUID().slice(0, 8);
    const email = `payment-confirm-smtp-${runId}@test.local`;

    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Payment Confirm SMTP Test",
        businessEmail: email,
        paymentStatus: "PAID",
        paidAt: new Date(),
        lastInvoiceNumber: `INV-${runId}`,
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);
    const confirmationSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentConfirmationEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false },
      invoices: { paymentConfirmationEnabled: true },
    });
    resetAutomationConfigCacheForTests();

    await expect(sendAutomatedPaymentConfirmation(email)).resolves.toBeUndefined();

    expect(confirmationSpy).not.toHaveBeenCalled();

    const delivery = await prisma.automationDeliveryLog.findFirst({
      where: { businessKey: email, actionType: "PAYMENT_CONFIRMATION" },
    });
    expect(delivery).toBeNull();

    smtpSpy.mockRestore();
    confirmationSpy.mockRestore();
  });

  it("EC-BE-038: skips payment confirmation when business has no email or paidAt", async () => {
    const runId = randomUUID().slice(0, 8);
    const noEmailKey = `no-email-${runId}@test.local`;
    const noPaidAtKey = `no-paid-at-${runId}@test.local`;

    billingAccountKeys.push(noEmailKey, noPaidAtKey);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: noEmailKey,
        businessName: "No Email Confirm Test",
        businessEmail: null,
        paymentStatus: "PAID",
        paidAt: new Date(),
        lastInvoiceNumber: `INV-${runId}-a`,
      },
    });
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: noPaidAtKey,
        businessName: "No PaidAt Confirm Test",
        businessEmail: noPaidAtKey,
        paymentStatus: "UNPAID",
        paidAt: null,
        lastInvoiceNumber: `INV-${runId}-b`,
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const confirmationSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentConfirmationEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false },
      invoices: { paymentConfirmationEnabled: true },
    });
    resetAutomationConfigCacheForTests();

    await sendAutomatedPaymentConfirmation(noEmailKey);
    await sendAutomatedPaymentConfirmation(noPaidAtKey);

    expect(confirmationSpy).not.toHaveBeenCalled();

    const deliveries = await prisma.automationDeliveryLog.findMany({
      where: {
        businessKey: { in: [noEmailKey, noPaidAtKey] },
        actionType: "PAYMENT_CONFIRMATION",
      },
    });
    expect(deliveries).toEqual([]);

    smtpSpy.mockRestore();
    confirmationSpy.mockRestore();
  });

  it("EC-BE-039: skips duplicate payment confirmation in the same billing cycle", async () => {
    const runId = randomUUID().slice(0, 8);
    const timezone = "Asia/Kolkata";
    const email = `payment-confirm-dedupe-${runId}@test.local`;
    const paidAt = new Date();
    const cycleKey = billingCycleMonthKeyInTimezone(timezone, paidAt);
    const dedupeKey = buildAutomationDedupeKey([
      email,
      "PAYMENT_CONFIRMATION",
      cycleKey,
    ]);

    deliveryDedupeKeys.push(dedupeKey);
    billingAccountKeys.push(email);
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey: email,
        businessName: "Payment Confirm Dedupe Test",
        businessEmail: email,
        paymentStatus: "PAID",
        paidAt,
        lastInvoiceNumber: `INV-${runId}`,
      },
    });

    const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
    const confirmationSpy = vi
      .spyOn(automationEmailsModule, "sendPaymentConfirmationEmail")
      .mockResolvedValue(undefined);

    await updateAutomationConfig({
      global: { enabled: true, dryRunMode: false, timezone },
      invoices: { paymentConfirmationEnabled: true },
    });
    resetAutomationConfigCacheForTests();

    await sendAutomatedPaymentConfirmation(email);
    await sendAutomatedPaymentConfirmation(email);

    expect(confirmationSpy).toHaveBeenCalledOnce();
    expect(confirmationSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        businessName: "Payment Confirm Dedupe Test",
        invoiceNumber: `INV-${runId}`,
      }),
    );

    const deliveries = await prisma.automationDeliveryLog.findMany({
      where: { businessKey: email, actionType: "PAYMENT_CONFIRMATION" },
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.dedupeKey).toBe(dedupeKey);

    smtpSpy.mockRestore();
    confirmationSpy.mockRestore();
  });

  it("EC-BE-040: returns 403 when non-master-admin calls POST /automation/run", async () => {
    const platformAdmin: PlatformAdminSession = {
      role: "PLATFORM_ADMIN",
      userId: "platform-admin-user",
      email: "platform-admin@test.local",
      permissions: { billing: true },
    };
    const storeManager: StoreSession = {
      role: "STORE_MANAGER",
      userId: "store-manager-user",
      email: "manager@test.local",
      storeId: "store-ec-be-040",
      storeName: "EC-BE-040 Store",
    };

    const runSpy = vi
      .spyOn(runBillingAutomationModule, "runBillingAutomation")
      .mockResolvedValue({
        runId: "should-not-run",
        status: "SUCCESS",
        summary: {
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
        },
        errors: [],
      });

    const sessionSpy = vi.spyOn(sessionModule, "getServerSession");

    for (const session of [platformAdmin, storeManager]) {
      sessionSpy.mockResolvedValueOnce(session);

      const response = await postAutomationRun(
        new Request("http://localhost/api/admin/automation/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dryRun: true }),
        }),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        message: "Only master admins can run automations.",
      });
    }

    expect(runSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    runSpy.mockRestore();
  });

  it("EC-BE-041: returns 400 when POST /automation/run body fails validation", async () => {
    const masterAdmin: MasterAdminSession = {
      role: "MASTER_ADMIN",
      userId: "master-admin-user",
      email: "master-admin@test.local",
      permissions: { billing: true },
    };

    const runSpy = vi
      .spyOn(runBillingAutomationModule, "runBillingAutomation")
      .mockResolvedValue({
        runId: "should-not-run",
        status: "SUCCESS",
        summary: {
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
        },
        errors: [],
      });
    const sessionSpy = vi
      .spyOn(sessionModule, "getServerSession")
      .mockResolvedValue(masterAdmin);

    const response = await postAutomationRun(
      new Request("http://localhost/api/admin/automation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: "not-a-boolean" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(runSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    runSpy.mockRestore();
  });

  it("EC-BE-042: returns 403 when non-master-admin calls PATCH /automation/config", async () => {
    const platformAdmin: PlatformAdminSession = {
      role: "PLATFORM_ADMIN",
      userId: "platform-admin-user",
      email: "platform-admin@test.local",
      permissions: { billing: true },
    };
    const storeManager: StoreSession = {
      role: "STORE_MANAGER",
      userId: "store-manager-user",
      email: "manager@test.local",
      storeId: "store-ec-be-042",
      storeName: "EC-BE-042 Store",
    };

    const updateSpy = vi.spyOn(automationConfigModule, "updateAutomationConfig");
    const sessionSpy = vi.spyOn(sessionModule, "getServerSession");

    for (const session of [platformAdmin, storeManager]) {
      sessionSpy.mockResolvedValueOnce(session);

      const response = await patchAutomationConfig(
        new Request("http://localhost/api/admin/automation/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ global: { enabled: false } }),
        }),
      );

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        message: "Only master admins can update automation settings.",
      });
    }

    expect(updateSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it("EC-BE-043: returns 403 when admin without billing permission calls GET /automation/config", async () => {
    const platformAdminNoBilling: PlatformAdminSession = {
      role: "PLATFORM_ADMIN",
      userId: "platform-admin-no-billing",
      email: "platform-no-billing@test.local",
      permissions: { portfolio: true, accounts: true, analytics: true },
    };

    const configSpy = vi.spyOn(automationConfigModule, "getAutomationConfig");
    const sessionSpy = vi
      .spyOn(sessionModule, "getServerSession")
      .mockResolvedValue(platformAdminNoBilling);

    const response = await getAutomationConfigRoute();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "You do not have access to this admin feature.",
    });
    expect(configSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    configSpy.mockRestore();
  });

  it("EC-BE-044: returns 400 when PATCH /automation/config body fails validation", async () => {
    const masterAdmin: MasterAdminSession = {
      role: "MASTER_ADMIN",
      userId: "master-admin-user",
      email: "master-admin@test.local",
      permissions: { billing: true },
    };

    const updateSpy = vi.spyOn(automationConfigModule, "updateAutomationConfig");
    const sessionSpy = vi
      .spyOn(sessionModule, "getServerSession")
      .mockResolvedValue(masterAdmin);

    const response = await patchAutomationConfig(
      new Request("http://localhost/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: { sendDayOfMonth: 29 } }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Validation failed");
    expect(body.details).toBeDefined();
    expect(updateSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it("EC-BE-045: caches automation config for ~30s, bypasses with fresh, and invalidates on update", async () => {
    vi.useFakeTimers();
    const findUniqueSpy = vi.spyOn(prisma.platformAutomationConfig, "findUnique");

    try {
      resetAutomationConfigCacheForTests();

      await getAutomationConfig();
      const callsAfterWarmCache = findUniqueSpy.mock.calls.length;
      expect(callsAfterWarmCache).toBeGreaterThanOrEqual(1);

      await getAutomationConfig();
      expect(findUniqueSpy.mock.calls.length).toBe(callsAfterWarmCache);

      await getAutomationConfig({ fresh: true });
      expect(findUniqueSpy.mock.calls.length).toBe(callsAfterWarmCache + 1);

      resetAutomationConfigCacheForTests();
      findUniqueSpy.mockClear();

      await getAutomationConfig();
      expect(findUniqueSpy.mock.calls.length).toBe(1);

      vi.advanceTimersByTime(29_000);
      await getAutomationConfig();
      expect(findUniqueSpy.mock.calls.length).toBe(1);

      vi.advanceTimersByTime(2_000);
      await getAutomationConfig();
      expect(findUniqueSpy.mock.calls.length).toBe(2);

      resetAutomationConfigCacheForTests();
      findUniqueSpy.mockClear();
      await getAutomationConfig();
      await getAutomationConfig();
      expect(findUniqueSpy.mock.calls.length).toBe(1);

      await updateAutomationConfig({ global: { dryRunMode: false } });
      await getAutomationConfig();
      expect(findUniqueSpy.mock.calls.length).toBe(3);
    } finally {
      findUniqueSpy.mockRestore();
      resetAutomationConfigCacheForTests();
      vi.useRealTimers();
    }
  });

  it("EC-BE-046: evaluates automation day boundary differently in UTC vs Asia/Kolkata", () => {
    const reference = new Date("2026-06-05T18:30:00.000Z");

    expect(getDayOfMonthInTimezone("UTC", reference)).toBe(5);
    expect(getDayOfMonthInTimezone("Asia/Kolkata", reference)).toBe(6);
    expect(shouldRunOnDayInTimezone(5, "UTC", reference)).toBe(true);
    expect(shouldRunOnDayInTimezone(5, "Asia/Kolkata", reference)).toBe(false);
    expect(shouldRunOnDayInTimezone(6, "Asia/Kolkata", reference)).toBe(true);
  });

  it("EC-BE-047: matches scheduled jobs against configured local hour in timezone", () => {
    const reference = new Date("2026-06-05T03:30:00.000Z");

    expect(getHourInTimezone("UTC", reference)).toBe(3);
    expect(getHourInTimezone("Asia/Kolkata", reference)).toBe(9);
    expect(shouldRunAtHourInTimezone(9, "Asia/Kolkata", reference)).toBe(true);
    expect(shouldRunAtHourInTimezone(3, "Asia/Kolkata", reference)).toBe(false);
    expect(shouldRunAtHourInTimezone(3, "UTC", reference)).toBe(true);
    expect(shouldRunAtHourInTimezone(9, "UTC", reference)).toBe(false);
  });

  it("EC-BE-048: caps configured day-of-month at 28 and matches safely in short months", async () => {
    const masterAdmin: MasterAdminSession = {
      role: "MASTER_ADMIN",
      userId: "master-admin-user",
      email: "master-admin@test.local",
      permissions: { billing: true },
    };
    const timezone = "Asia/Kolkata";
    const februaryTwentyEighth = new Date("2026-02-28T06:00:00.000Z");
    const januaryThirtyFirst = new Date("2026-01-31T06:00:00.000Z");

    const updateSpy = vi.spyOn(automationConfigModule, "updateAutomationConfig");
    const sessionSpy = vi
      .spyOn(sessionModule, "getServerSession")
      .mockResolvedValue(masterAdmin);

    const response = await patchAutomationConfig(
      new Request("http://localhost/api/admin/automation/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: { sendDayOfMonth: 29 } }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Validation failed",
    });
    expect(updateSpy).not.toHaveBeenCalled();

    expect(getDayOfMonthInTimezone(timezone, februaryTwentyEighth)).toBe(28);
    expect(shouldRunOnDayInTimezone(28, timezone, februaryTwentyEighth)).toBe(true);
    expect(getDayOfMonthInTimezone(timezone, januaryThirtyFirst)).toBe(31);
    expect(shouldRunOnDayInTimezone(28, timezone, januaryThirtyFirst)).toBe(false);

    sessionSpy.mockRestore();
    updateSpy.mockRestore();
  });
});
