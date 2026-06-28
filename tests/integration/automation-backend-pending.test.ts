import { GET as getBillingAutomationCron } from "@/app/api/cron/billing-automation/route";
import { POST as postAutomationRun } from "@/app/api/admin/automation/run/route";
import { PATCH as patchAutomationConfig } from "@/app/api/admin/automation/config/route";
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  billingCycleMonthKeyInTimezone,
  getDayOfMonthInTimezone,
  getMonthYearInTimezone,
  isValidIanaTimezone,
  shouldRunOnDayInTimezone,
} from "@/lib/automation/timezone";
import { buildAutomationDedupeKey } from "@/lib/automation/delivery-log";
import { automationConfigPatchSchema } from "@/lib/automation/config-schema";
import { getActivationBillingPeriod } from "@/lib/billing/activation-cycle";
import * as sessionModule from "@/lib/auth/session";
import * as automationConfigModule from "@/lib/services/automation-config";
import * as emailEnv from "@/lib/email/env";
import { isSmtpConfigured } from "@/lib/email/env";
import { verifySmtpConnection } from "@/lib/email/send-mail";
import {
  resetAutomationConfigCacheForTests,
  updateAutomationConfig,
} from "@/lib/services/automation-config";
import * as sendBusinessInvoiceModule from "@/lib/services/send-business-invoice";
import * as storesModule from "@/lib/services/stores";
import {
  createBillingFollowUp,
  updateBillingPaymentStatus,
} from "@/lib/services/billing-accounts";
import { getBillingDatesForPaidCycle } from "@/lib/utils/billing-cycle";
import { isWhatsAppApiConfigured } from "@/lib/whatsapp/send-message";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";
import { assertWithinBudget, PERF_BUDGETS } from "@/tests/helpers/perf-budgets";
import { broadcastSyncEvent, syncBroadcaster } from "@/lib/sync/broadcaster";
import * as redisSyncBridge from "@/lib/sync/redis-sync-bridge";
import type { SyncVersionPayload } from "@/lib/sync/version";
import type { AdminStorePortfolioRow, MasterAdminSession } from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);
const runLiveDelivery = process.env.RUN_LIVE_AUTOMATION_SMTP === "true";
const runLiveWhatsApp = process.env.RUN_LIVE_WHATSAPP_API === "true";

function makePortfolioStore(input: {
  storeId: string;
  ownerEmail: string;
  renewalDueAt?: string | null;
  dataExpiryAt?: string | null;
  storeManagerPhone?: string | null;
  createdAt?: string;
  businessOwnerName?: string;
}): AdminStorePortfolioRow {
  const now = new Date().toISOString();
  return {
    storeId: input.storeId,
    storeName: `Store ${input.storeId}`,
    category: "JEWELRY",
    city: "Mumbai",
    state: "MH",
    isActive: true,
    businessOwnerName: input.businessOwnerName ?? "Live SMTP Owner",
    businessOwnerEmail: input.ownerEmail,
    storeManagerName: null,
    storeManagerPhone: input.storeManagerPhone ?? null,
    staffCount: 0,
    createdAt: input.createdAt ?? now,
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

describe.skipIf(!hasDb || !isSmtpConfigured())(
  "EC-BE-071: cron + real SMTP end-to-end delivery",
  () => {
    const runIds: string[] = [];
    const deliveryBusinessKeys: string[] = [];
    const cronSecret = process.env.CRON_SECRET?.trim() || "vitest-ec-be-071-cron-secret";

    beforeAll(() => {
      process.env.CRON_SECRET = cronSecret;
    });

    afterAll(async () => {
      if (deliveryBusinessKeys.length > 0) {
        await prisma.automationDeliveryLog.deleteMany({
          where: { businessKey: { in: deliveryBusinessKeys } },
        });
      }
      if (runIds.length > 0) {
        await prisma.automationRunLog.deleteMany({ where: { id: { in: runIds } } });
      }
      await updateAutomationConfig({ global: { enabled: false, dryRunMode: false } });
      resetAutomationConfigCacheForTests();
      await prisma.$disconnect();
    });

    async function configureRenewalInvoiceAutomation(runId: string) {
      const timezone = "Asia/Kolkata";
      const today = getDayOfMonthInTimezone(timezone);
      const notInvoiceDay = today <= 15 ? 28 : 1;
      const daysBeforeRenewal = 3;

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

      return { timezone, daysBeforeRenewal, notInvoiceDay };
    }

    it("passes SMTP preflight and cron invoice delivery path", async () => {
      await verifySmtpConnection();

      const runId = randomUUID().slice(0, 8);
      const email = `ec-be-071-${runId}@test.local`;
      deliveryBusinessKeys.push(email);
      const { daysBeforeRenewal } = await configureRenewalInvoiceAutomation(runId);

      const storesSpy = vi.spyOn(storesModule, "getAdminPortfolioStoreRows").mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: email,
          renewalDueAt: addCalendarDays(new Date(), daysBeforeRenewal),
        }),
      ]);
      const invoiceSpy = vi
        .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
        .mockResolvedValue({
          invoiceNumber: `INV-LIVE-PREFLIGHT-${runId}`,
          sentTo: email,
          grandTotal: 2_500,
        });

      const response = await getBillingAutomationCron(
        new Request("http://localhost/api/cron/billing-automation", {
          headers: { Authorization: `Bearer ${cronSecret}` },
        }),
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      runIds.push(body.runId);

      expect(body.summary.invoicesSent).toBe(1);
      expect(body.errors).toEqual([]);
      expect(invoiceSpy).toHaveBeenCalledOnce();
      expect(invoiceSpy).toHaveBeenCalledWith(email, "cron@fineset.local");

      const delivery = await prisma.automationDeliveryLog.findFirst({
        where: { businessKey: email, actionType: "INVOICE" },
      });
      expect(delivery).not.toBeNull();

      storesSpy.mockRestore();
      invoiceSpy.mockRestore();
    });

    it.skipIf(!runLiveDelivery)(
      "sends a real invoice email through SMTP when RUN_LIVE_AUTOMATION_SMTP=true",
      async () => {
        await verifySmtpConnection();

        const runId = randomUUID().slice(0, 8);
        const recipient =
          process.env.AUTOMATION_LIVE_TEST_EMAIL?.trim() ||
          process.env.SMTP_USER?.trim() ||
          "";
        expect(recipient).not.toBe("");
        deliveryBusinessKeys.push(recipient);

        const { daysBeforeRenewal } = await configureRenewalInvoiceAutomation(runId);

        const storesSpy = vi.spyOn(storesModule, "getAdminPortfolioStoreRows").mockResolvedValue([
          makePortfolioStore({
            storeId: `store-live-${runId}`,
            ownerEmail: recipient,
            renewalDueAt: addCalendarDays(new Date(), daysBeforeRenewal),
          }),
        ]);

        const response = await getBillingAutomationCron(
          new Request("http://localhost/api/cron/billing-automation", {
            headers: { Authorization: `Bearer ${cronSecret}` },
          }),
        );

        expect(response.status).toBe(200);
        const body = await response.json();
        runIds.push(body.runId);

        expect(body.summary.invoicesSent).toBe(1);
        expect(body.errors).toEqual([]);
        expect(
          body.summary.details.some(
            (detail: { action: string; businessKey: string; status: string }) =>
              detail.action === "invoice" &&
              detail.businessKey === recipient &&
              detail.status === "success",
          ),
        ).toBe(true);

        storesSpy.mockRestore();
      },
      120_000,
    );
  },
);

describe.skipIf(!hasDb)(
  "EC-BE-072: WhatsApp Cloud API auto-send (if enabled)",
  () => {
    const savedWhatsAppToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const savedWhatsAppPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    afterAll(() => {
      if (savedWhatsAppToken === undefined) {
        delete process.env.WHATSAPP_ACCESS_TOKEN;
      } else {
        process.env.WHATSAPP_ACCESS_TOKEN = savedWhatsAppToken;
      }
      if (savedWhatsAppPhoneId === undefined) {
        delete process.env.WHATSAPP_PHONE_NUMBER_ID;
      } else {
        process.env.WHATSAPP_PHONE_NUMBER_ID = savedWhatsAppPhoneId;
      }
    });

    it("auto-sends payment-not-received WhatsApp when Cloud API is configured", async () => {
      process.env.WHATSAPP_ACCESS_TOKEN = "vitest-ec-be-072-token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "vitest-ec-be-072-phone-id";
      vi.resetModules();

      const runId = randomUUID().slice(0, 8);
      const businessKey = `ec-be-072-${runId}@test.local`;
      const phone = "9876543210";

      const storesFresh = await import("@/lib/services/stores");
      const storesSpy = vi.spyOn(storesFresh, "getAdminPortfolioStoreRows").mockResolvedValue([
        makePortfolioStore({
          storeId: `store-${runId}`,
          ownerEmail: businessKey,
          storeManagerPhone: phone,
        }),
      ]);
      const whatsAppModule = await import("@/lib/whatsapp/send-message");
      const sendSpy = vi
        .spyOn(whatsAppModule, "sendWhatsAppTextMessage")
        .mockResolvedValue(undefined);
      const { sendPaymentNotReceivedNotifications } = await import(
        "@/lib/services/payment-not-received-notifications"
      );

      const result = await sendPaymentNotReceivedNotifications({
        businessKey,
        businessName: "WhatsApp Auto Send Test",
        businessEmail: null,
        invoiceNumber: `INV-WA-${runId}`,
        amountInr: 5_900,
        submittedByName: "Owner",
        reviewedByEmail: "admin@test.local",
      });

      expect(result.whatsAppSent).toBe(true);
      expect(result.whatsAppQueued).toBe(false);
      expect(sendSpy).toHaveBeenCalledOnce();
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toPhone: phone,
          message: expect.stringContaining("could not verify receipt"),
        }),
      );

      storesSpy.mockRestore();
      sendSpy.mockRestore();
    });

    it.skipIf(!isWhatsAppApiConfigured() || !runLiveWhatsApp)(
      "delivers a real WhatsApp message when RUN_LIVE_WHATSAPP_API=true",
      async () => {
        const runId = randomUUID().slice(0, 8);
        const businessKey = `ec-be-072-live-${runId}@test.local`;
        const phone =
          process.env.AUTOMATION_LIVE_TEST_PHONE?.trim() || "9876543210";

        const storesSpy = vi.spyOn(storesModule, "getAdminPortfolioStoreRows").mockResolvedValue([
          makePortfolioStore({
            storeId: `store-live-${runId}`,
            ownerEmail: businessKey,
            storeManagerPhone: phone,
          }),
        ]);
        const { sendPaymentNotReceivedNotifications } = await import(
          "@/lib/services/payment-not-received-notifications"
        );

        const result = await sendPaymentNotReceivedNotifications({
          businessKey,
          businessName: "WhatsApp Live Send Test",
          businessEmail: null,
          invoiceNumber: `INV-WA-LIVE-${runId}`,
          amountInr: 5_900,
          submittedByName: "Owner",
          reviewedByEmail: "admin@test.local",
        });

        expect(result.whatsAppSent).toBe(true);
        expect(result.whatsAppQueued).toBe(false);

        storesSpy.mockRestore();
      },
      120_000,
    );
  },
);

describe.skipIf(!hasDb)(
  "EC-BE-073: concurrent cron + manual automation run",
  () => {
    const runIds: string[] = [];
    const deliveryDedupeKeys: string[] = [];
    const cronSecret = process.env.CRON_SECRET?.trim() || "vitest-ec-be-073-cron-secret";

    beforeAll(() => {
      process.env.CRON_SECRET = cronSecret;
    });

    afterAll(async () => {
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
    });

    it("dedupes invoice delivery when cron and manual runs execute concurrently", async () => {
      const runId = randomUUID().slice(0, 8);
      const timezone = "Asia/Kolkata";
      const invoiceDay = getDayOfMonthInTimezone(timezone);
      const email = `ec-be-073-${runId}@test.local`;
      const dedupeKey = buildAutomationDedupeKey([
        email,
        "INVOICE",
        billingCycleMonthKeyInTimezone(timezone),
        `Scheduled invoice day (${invoiceDay})`,
      ]);
      deliveryDedupeKeys.push(dedupeKey);

      const masterAdmin: MasterAdminSession = {
        role: "MASTER_ADMIN",
        userId: "master-admin-ec-be-073",
        email: "master-admin@test.local",
        permissions: { billing: true },
      };

      const smtpSpy = vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(true);
      const storesSpy = vi.spyOn(storesModule, "getAdminPortfolioStoreRows").mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);
      const invoiceSpy = vi
        .spyOn(sendBusinessInvoiceModule, "sendBusinessInvoice")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            invoiceNumber: `INV-CONCURRENT-${runId}`,
            sentTo: email,
            grandTotal: 1_500,
          };
        });
      const sessionSpy = vi
        .spyOn(sessionModule, "getServerSession")
        .mockResolvedValue(masterAdmin);

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

      const [cronResponse, manualResponse] = await Promise.all([
        getBillingAutomationCron(
          new Request("http://localhost/api/cron/billing-automation", {
            headers: { Authorization: `Bearer ${cronSecret}` },
          }),
        ),
        postAutomationRun(
          new Request("http://localhost/api/admin/automation/run", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dryRun: false }),
          }),
        ),
      ]);

      expect(cronResponse.status).toBe(200);
      expect(manualResponse.status).toBe(200);

      const cronBody = await cronResponse.json();
      const manualBody = await manualResponse.json();
      runIds.push(cronBody.runId, manualBody.runId);

      expect(cronBody.runId).not.toBe(manualBody.runId);
      expect(cronBody.errors).toEqual([]);
      expect(manualBody.errors).toEqual([]);
      expect(cronBody.summary.invoicesSent + manualBody.summary.invoicesSent).toBe(1);
      expect(invoiceSpy).toHaveBeenCalledOnce();

      const skippedDetails = [...cronBody.summary.details, ...manualBody.summary.details].filter(
        (detail: { message?: string }) =>
          detail.message === "Already sent for this billing period",
      );
      expect(skippedDetails.length).toBeGreaterThanOrEqual(1);

      const deliveryCount = await prisma.automationDeliveryLog.count({
        where: { businessKey: email, actionType: "INVOICE" },
      });
      expect(deliveryCount).toBe(1);

      const runLogs = await prisma.automationRunLog.findMany({
        where: { id: { in: [cronBody.runId, manualBody.runId] } },
      });
      expect(runLogs.map((row) => row.trigger).sort()).toEqual(["CRON", "MANUAL"]);

      smtpSpy.mockRestore();
      storesSpy.mockRestore();
      invoiceSpy.mockRestore();
      sessionSpy.mockRestore();
    }, 60_000);
  },
);

describe("EC-BE-074: leap month and day 29–31 billing anchors", () => {
  it("clamps activation billing period starts to the last day of short months", () => {
    const jan31Anchor = new Date(2026, 0, 31);
    const febPeriod = getActivationBillingPeriod(jan31Anchor, new Date(2026, 2, 15));

    expect(febPeriod.periodStart.getFullYear()).toBe(2026);
    expect(febPeriod.periodStart.getMonth()).toBe(1);
    expect(febPeriod.periodStart.getDate()).toBe(28);

    const leapFebPeriod = getActivationBillingPeriod(
      new Date(2028, 0, 31),
      new Date(2028, 2, 15),
    );
    expect(leapFebPeriod.periodStart.getMonth()).toBe(1);
    expect(leapFebPeriod.periodStart.getDate()).toBe(29);

    const mar31Anchor = new Date(2026, 2, 31);
    const aprilPeriod = getActivationBillingPeriod(mar31Anchor, new Date(2026, 4, 15));
    expect(aprilPeriod.periodStart.getMonth()).toBe(3);
    expect(aprilPeriod.periodStart.getDate()).toBe(30);
  });

  it("derives stable billing cycle month keys across timezone month boundaries", () => {
    const reference = new Date("2026-01-31T18:30:00.000Z");

    expect(getMonthYearInTimezone("UTC", reference)).toEqual({ year: 2026, month: 1 });
    expect(billingCycleMonthKeyInTimezone("UTC", reference)).toBe("2026-01");

    expect(getMonthYearInTimezone("Asia/Kolkata", reference)).toEqual({ year: 2026, month: 2 });
    expect(billingCycleMonthKeyInTimezone("Asia/Kolkata", reference)).toBe("2026-02");
  });

  it("never treats calendar days 29–31 as configured sendDayOfMonth 28", () => {
    const timezone = "Asia/Kolkata";
    const day29 = new Date("2026-01-28T18:30:00.000Z");
    const day30 = new Date("2026-01-29T18:30:00.000Z");
    const day31 = new Date("2026-01-30T18:30:00.000Z");
    const feb28 = new Date("2026-02-27T18:30:00.000Z");

    expect(getDayOfMonthInTimezone(timezone, day29)).toBe(29);
    expect(getDayOfMonthInTimezone(timezone, day30)).toBe(30);
    expect(getDayOfMonthInTimezone(timezone, day31)).toBe(31);
    expect(getDayOfMonthInTimezone(timezone, feb28)).toBe(28);

    for (const reference of [day29, day30, day31]) {
      expect(shouldRunOnDayInTimezone(28, timezone, reference)).toBe(false);
    }
    expect(shouldRunOnDayInTimezone(28, timezone, feb28)).toBe(true);
  });

  it("projects paid-cycle renewal and expiry dates without overflowing short months", () => {
    const settings = { cycleStartDay: 28, paymentDueDay: 28, gracePeriodDays: 28 };
    const janReference = new Date(2026, 0, 15);
    const janDates = getBillingDatesForPaidCycle(janReference, settings);

    expect(janDates.renewalDueAt.getDate()).toBe(28);
    expect(janDates.dataExpiryAt.getDate()).toBe(28);
    expect(janDates.dataExpiryAt.getMonth()).toBe(1);
  });

  it.skipIf(!hasDb)("returns 400 when billing cycle anchors exceed day 28", async () => {
    const masterAdmin: MasterAdminSession = {
      role: "MASTER_ADMIN",
      userId: "master-admin-ec-be-074",
      email: "master-admin@test.local",
      permissions: { billing: true },
    };
    const updateSpy = vi.spyOn(automationConfigModule, "updateAutomationConfig");
    const sessionSpy = vi
      .spyOn(sessionModule, "getServerSession")
      .mockResolvedValue(masterAdmin);

    for (const payload of [
      { billingCycle: { cycleStartDay: 29 } },
      { billingCycle: { paymentDueDay: 30 } },
      { billingCycle: { gracePeriodDays: 31 } },
      { monthlyReports: { sendDayOfMonth: 31 } },
    ]) {
      const response = await patchAutomationConfig(
        new Request("http://localhost/api/admin/automation/config", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        message: "Validation failed",
      });
    }

    expect(updateSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    updateSpy.mockRestore();
  });
});

describe("EC-BE-075: invalid IANA timezone in automation config", () => {
  it("rejects unknown timezone strings in automation config schema", () => {
    for (const timezone of ["Not/A_Timezone", "Asia/NotRealCity", "GMT+5:30", ""]) {
      const parsed = automationConfigPatchSchema.safeParse({
        global: { timezone },
      });
      expect(parsed.success).toBe(false);
    }

    for (const timezone of ["Asia/Kolkata", "UTC", "America/New_York"]) {
      const parsed = automationConfigPatchSchema.safeParse({
        global: { timezone },
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("validates IANA timezones before automation date helpers run", () => {
    expect(isValidIanaTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaTimezone("Not/A_Timezone")).toBe(false);

    expect(() => getDayOfMonthInTimezone("Not/A_Timezone")).toThrow(RangeError);
  });

  it.skipIf(!hasDb)("returns 400 when PATCH /automation/config uses invalid timezone", async () => {
    const masterAdmin: MasterAdminSession = {
      role: "MASTER_ADMIN",
      userId: "master-admin-ec-be-075",
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
        body: JSON.stringify({ global: { timezone: "Not/A_Timezone" } }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Validation failed",
    });
    expect(updateSpy).not.toHaveBeenCalled();

    sessionSpy.mockRestore();
    updateSpy.mockRestore();
  });
});

describe.skipIf(!hasDb)(
  "EC-BE-076: 100+ businesses automation performance",
  () => {
    const runIds: string[] = [];
    const businessCount = 120;

    afterAll(async () => {
      if (runIds.length > 0) {
        await prisma.automationRunLog.deleteMany({ where: { id: { in: runIds } } });
      }
      await updateAutomationConfig({ global: { enabled: false, dryRunMode: false } });
      resetAutomationConfigCacheForTests();
    });

    it("completes a dry-run over 120 businesses within the performance budget", async () => {
      const runId = randomUUID().slice(0, 8);
      const timezone = "Asia/Kolkata";
      const invoiceDay = getDayOfMonthInTimezone(timezone);

      const portfolioStores = Array.from({ length: businessCount }, (_, index) =>
        makePortfolioStore({
          storeId: `perf-${index}-${runId}`,
          ownerEmail: `perf-${index}-${runId}@test.local`,
        }),
      );

      const storesSpy = vi
        .spyOn(storesModule, "getAdminPortfolioStoreRows")
        .mockResolvedValue(portfolioStores);

      await updateAutomationConfig({
        global: { enabled: true, dryRunMode: true, timezone },
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

      const started = Date.now();
      const result = await runBillingAutomation({
        trigger: "MANUAL",
        dryRun: true,
        triggeredByEmail: "vitest@local",
      });
      const elapsed = Date.now() - started;

      runIds.push(result.runId);
      assertWithinBudget(elapsed, PERF_BUDGETS.automation.run120BusinessesDryRun);

      expect(result.status).toBe("SUCCESS");
      expect(result.errors).toEqual([]);
      expect(storesSpy).toHaveBeenCalledOnce();
      expect(
        result.summary.details.filter(
          (detail) => detail.action === "invoice" && detail.status === "queued",
        ),
      ).toHaveLength(businessCount);

      storesSpy.mockRestore();
    }, 120_000);
  },
);

describe.skipIf(!hasDb)(
  "EC-BE-077: payment confirmation after partial pay",
  () => {
    const billingAccountKeys: string[] = [];
    const deliveryDedupeKeys: string[] = [];

    afterAll(async () => {
      if (deliveryDedupeKeys.length > 0) {
        await prisma.automationDeliveryLog.deleteMany({
          where: { dedupeKey: { in: deliveryDedupeKeys } },
        });
      }
      if (billingAccountKeys.length > 0) {
        await prisma.billingFollowUp.deleteMany({
          where: { account: { businessKey: { in: billingAccountKeys } } },
        });
        await prisma.billingBusinessAccount.deleteMany({
          where: { businessKey: { in: billingAccountKeys } },
        });
      }
      await updateAutomationConfig({
        global: { enabled: false, dryRunMode: false },
        invoices: { paymentConfirmationEnabled: true },
      });
      resetAutomationConfigCacheForTests();
    });

    it("skips confirmation on partial pay and sends once when fully paid", async () => {
      const runId = randomUUID().slice(0, 8);
      const timezone = "Asia/Kolkata";
      const email = `ec-be-077-${runId}@test.local`;
      billingAccountKeys.push(email);

      await prisma.billingBusinessAccount.create({
        data: {
          businessKey: email,
          businessName: "Partial Pay Confirm Test",
          businessEmail: email,
          paymentStatus: "UNPAID",
          paidAt: null,
          lastInvoiceNumber: `INV-${runId}`,
        },
      });

      const emailEnvFresh = await import("@/lib/email/env");
      const automationEmailsFresh = await import("@/lib/emails/automation-emails");
      const smtpSpy = vi.spyOn(emailEnvFresh, "isSmtpConfigured").mockReturnValue(true);
      const confirmationSpy = vi
        .spyOn(automationEmailsFresh, "sendPaymentConfirmationEmail")
        .mockResolvedValue(undefined);

      await updateAutomationConfig({
        global: { enabled: true, dryRunMode: false, timezone },
        invoices: { paymentConfirmationEnabled: true },
      });
      resetAutomationConfigCacheForTests();

      const storesSpy = vi.spyOn(storesModule, "getAdminPortfolioStoreRows").mockResolvedValue([
        makePortfolioStore({ storeId: `store-${runId}`, ownerEmail: email }),
      ]);

      await updateBillingPaymentStatus({
        businessKey: email,
        paymentStatus: "PARTIAL",
        notes: `Partial payment recorded ${runId}`,
        createdByEmail: "admin@test.local",
      });

      expect(confirmationSpy).not.toHaveBeenCalled();

      let account = await prisma.billingBusinessAccount.findUnique({
        where: { businessKey: email },
      });
      expect(account?.paymentStatus).toBe("PARTIAL");
      expect(account?.paidAt).toBeNull();

      await createBillingFollowUp({
        businessKey: email,
        channel: "PHONE",
        outcome: "PARTIAL_PAYMENT",
        notes: `Follow-up partial ${runId}`,
        createdByEmail: "admin@test.local",
      });

      expect(confirmationSpy).not.toHaveBeenCalled();

      await updateBillingPaymentStatus({
        businessKey: email,
        paymentStatus: "PAID",
        notes: `Remaining balance paid ${runId}`,
        createdByEmail: "admin@test.local",
        forceImmediateActivation: true,
      });

      await vi.waitFor(
        async () => {
          expect(confirmationSpy).toHaveBeenCalledOnce();
          const pendingDeliveries = await prisma.automationDeliveryLog.findMany({
            where: { businessKey: email, actionType: "PAYMENT_CONFIRMATION" },
          });
          expect(pendingDeliveries).toHaveLength(1);
        },
        { timeout: 15_000 },
      );

      account = await prisma.billingBusinessAccount.findUnique({
        where: { businessKey: email },
      });
      expect(account?.paymentStatus).toBe("PAID");
      expect(account?.paidAt).not.toBeNull();

      expect(confirmationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          businessName: "Partial Pay Confirm Test",
          invoiceNumber: `INV-${runId}`,
        }),
      );

      const deliveries = await prisma.automationDeliveryLog.findMany({
        where: { businessKey: email, actionType: "PAYMENT_CONFIRMATION" },
      });
      expect(deliveries).toHaveLength(1);
      deliveryDedupeKeys.push(deliveries[0]!.dedupeKey);

      storesSpy.mockRestore();
      smtpSpy.mockRestore();
      confirmationSpy.mockRestore();
    }, 60_000);
  },
);

describe.skipIf(!hasDb)(
  "EC-BE-078: autoExtendOnPayment wiring",
  () => {
    const storeIds: string[] = [];
    const billingAccountKeys: string[] = [];
    const billingAnchor = new Date(2026, 0, 15);
    const reference = new Date();
    const currentPeriod = getActivationBillingPeriod(billingAnchor, reference);
    const extendedPeriod = getActivationBillingPeriod(
      billingAnchor,
      new Date(currentPeriod.periodEnd.getTime() + 86_400_000),
    );

    afterAll(async () => {
      if (billingAccountKeys.length > 0) {
        await prisma.billingFollowUp.deleteMany({
          where: { account: { businessKey: { in: billingAccountKeys } } },
        });
        await prisma.billingBusinessAccount.deleteMany({
          where: { businessKey: { in: billingAccountKeys } },
        });
      }
      if (storeIds.length > 0) {
        await prisma.store.deleteMany({ where: { id: { in: storeIds } } });
      }
      await updateAutomationConfig({
        expiryRenewal: { autoExtendOnPayment: true },
        invoices: { paymentConfirmationEnabled: false },
      });
      resetAutomationConfigCacheForTests();
    });

    async function seedBusiness(runId: string) {
      const email = `ec-be-078-${runId}@test.local`;
      billingAccountKeys.push(email);

      const store = await prisma.store.create({
        data: {
          name: `EC-BE-078 Store ${runId}`,
          category: "JEWELRY",
          city: "Mumbai",
          state: "MH",
          businessOwnerName: "Auto Extend Test",
          businessOwnerEmail: email,
          isActive: true,
          createdAt: billingAnchor,
          renewalDueAt: currentPeriod.dueDate,
          dataExpiryAt: currentPeriod.periodEnd,
        },
      });
      storeIds.push(store.id);

      await prisma.billingBusinessAccount.create({
        data: {
          businessKey: email,
          businessName: "Auto Extend Test",
          businessEmail: email,
          paymentStatus: "UNPAID",
          paidAt: null,
        },
      });

      return { email, storeId: store.id };
    }

    function mockPortfolio(email: string, storeId: string) {
      return vi.spyOn(storesModule, "getAdminPortfolioStoreRows").mockResolvedValue([
        makePortfolioStore({
          storeId,
          ownerEmail: email,
          businessOwnerName: "Auto Extend Test",
          createdAt: billingAnchor.toISOString(),
          renewalDueAt: currentPeriod.dueDate.toISOString(),
          dataExpiryAt: currentPeriod.periodEnd.toISOString(),
        }),
      ]);
    }

    it("does not extend store dates on PAID when autoExtendOnPayment is disabled", async () => {
      const runId = randomUUID().slice(0, 8);
      const { email, storeId } = await seedBusiness(runId);
      const storesSpy = mockPortfolio(email, storeId);
      vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);

      await updateAutomationConfig({
        expiryRenewal: { autoExtendOnPayment: false },
        invoices: { paymentConfirmationEnabled: false },
      });
      resetAutomationConfigCacheForTests();

      await updateBillingPaymentStatus({
        businessKey: email,
        paymentStatus: "PAID",
        notes: `Paid without auto extend ${runId}`,
        createdByEmail: "admin@test.local",
      });

      const store = await prisma.store.findUnique({ where: { id: storeId } });
      expect(store?.renewalDueAt?.toISOString()).toBe(currentPeriod.dueDate.toISOString());
      expect(store?.dataExpiryAt?.toISOString()).toBe(currentPeriod.periodEnd.toISOString());

      storesSpy.mockRestore();
    }, 60_000);

    it("extends store dates on PAID when autoExtendOnPayment is enabled", async () => {
      const runId = randomUUID().slice(0, 8);
      const { email, storeId } = await seedBusiness(runId);
      const storesSpy = mockPortfolio(email, storeId);
      vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);

      await updateAutomationConfig({
        expiryRenewal: { autoExtendOnPayment: true },
        invoices: { paymentConfirmationEnabled: false },
      });
      resetAutomationConfigCacheForTests();

      await updateBillingPaymentStatus({
        businessKey: email,
        paymentStatus: "PAID",
        notes: `Paid with auto extend ${runId}`,
        createdByEmail: "admin@test.local",
      });

      const store = await prisma.store.findUnique({ where: { id: storeId } });
      expect(store?.renewalDueAt?.toISOString()).toBe(extendedPeriod.dueDate.toISOString());
      expect(store?.dataExpiryAt?.toISOString()).toBe(extendedPeriod.periodEnd.toISOString());

      storesSpy.mockRestore();
    }, 60_000);

    it("extends store dates when forceImmediateActivation bypasses disabled autoExtendOnPayment", async () => {
      const runId = randomUUID().slice(0, 8);
      const { email, storeId } = await seedBusiness(runId);
      const storesSpy = mockPortfolio(email, storeId);
      vi.spyOn(emailEnv, "isSmtpConfigured").mockReturnValue(false);

      await updateAutomationConfig({
        expiryRenewal: { autoExtendOnPayment: false },
        invoices: { paymentConfirmationEnabled: false },
      });
      resetAutomationConfigCacheForTests();

      await updateBillingPaymentStatus({
        businessKey: email,
        paymentStatus: "PAID",
        notes: `Admin forced activation ${runId}`,
        createdByEmail: "admin@test.local",
        forceImmediateActivation: true,
      });

      const store = await prisma.store.findUnique({ where: { id: storeId } });
      expect(store?.renewalDueAt?.toISOString()).toBe(extendedPeriod.dueDate.toISOString());
      expect(store?.dataExpiryAt?.toISOString()).toBe(extendedPeriod.periodEnd.toISOString());

      storesSpy.mockRestore();
    }, 60_000);
  },
);

describe("EC-BE-079: Redis/SSE under automation load", () => {
  it("fans out burst sync events to SSE subscribers and Redis without failing", async () => {
    const publishSpy = vi
      .spyOn(redisSyncBridge, "publishSyncEventToRedis")
      .mockResolvedValue(undefined);
    const received: SyncVersionPayload[] = [];
    const unsubscribe = syncBroadcaster.subscribe("all", (payload) => {
      received.push(payload);
    });

    const eventCount = 120;
    for (let index = 0; index < eventCount; index += 1) {
      broadcastSyncEvent(`store-load-${index}`, ["stores"]);
    }

    expect(received).toHaveLength(eventCount);
    expect(received.every((payload) => payload.entities.includes("stores"))).toBe(true);
    expect(publishSpy).toHaveBeenCalledTimes(eventCount);
    expect(
      received.every(
        (payload, index) =>
          payload.scope === `store-load-${index}` &&
          payload.version.startsWith(`store-load-${index}:`),
      ),
    ).toBe(true);

    unsubscribe();
    publishSpy.mockRestore();
  });

  it("keeps in-memory SSE delivery working when Redis publish fails", () => {
    const publishSpy = vi
      .spyOn(redisSyncBridge, "publishSyncEventToRedis")
      .mockRejectedValue(new Error("redis unavailable"));
    const received: string[] = [];
    const unsubscribe = syncBroadcaster.subscribe("all", (payload) => {
      received.push(payload.version);
    });

    expect(() => broadcastSyncEvent("store-redis-down", ["stores"])).not.toThrow();
    expect(received).toHaveLength(1);

    unsubscribe();
    publishSpy.mockRestore();
  });
});

describe.skipIf(!hasDb)(
  "EC-BE-079: Redis/SSE under automation load (integration)",
  () => {
    const runIds: string[] = [];

    afterAll(async () => {
      if (runIds.length > 0) {
        await prisma.automationRunLog.deleteMany({ where: { id: { in: runIds } } });
      }
      await updateAutomationConfig({ global: { enabled: false, dryRunMode: false } });
      resetAutomationConfigCacheForTests();
    });

    it("completes automation dry-run while concurrent sync events are broadcast", async () => {
      const runId = randomUUID().slice(0, 8);
      const timezone = "Asia/Kolkata";
      const invoiceDay = getDayOfMonthInTimezone(timezone);
      const businessCount = 120;

      const portfolioStores = Array.from({ length: businessCount }, (_, index) =>
        makePortfolioStore({
          storeId: `sse-load-${index}-${runId}`,
          ownerEmail: `sse-load-${index}-${runId}@test.local`,
        }),
      );

      const storesSpy = vi
        .spyOn(storesModule, "getAdminPortfolioStoreRows")
        .mockResolvedValue(portfolioStores);
      const publishSpy = vi
        .spyOn(redisSyncBridge, "publishSyncEventToRedis")
        .mockResolvedValue(undefined);
      const received: SyncVersionPayload[] = [];
      const unsubscribe = syncBroadcaster.subscribe("all", (payload) => {
        received.push(payload);
      });

      await updateAutomationConfig({
        global: { enabled: true, dryRunMode: true, timezone },
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

      const started = Date.now();
      const [result] = await Promise.all([
        runBillingAutomation({
          trigger: "MANUAL",
          dryRun: true,
          triggeredByEmail: "vitest@local",
        }),
        Promise.resolve().then(async () => {
          for (let index = 0; index < businessCount; index += 1) {
            broadcastSyncEvent(`sse-load-${index}-${runId}`, ["stores"]);
          }
        }),
      ]);
      const elapsed = Date.now() - started;

      runIds.push(result.runId);
      assertWithinBudget(elapsed, PERF_BUDGETS.automation.run120BusinessesDryRun);

      expect(result.status).toBe("SUCCESS");
      expect(result.errors).toEqual([]);
      expect(
        result.summary.details.filter(
          (detail) => detail.action === "invoice" && detail.status === "queued",
        ),
      ).toHaveLength(businessCount);
      expect(received.length).toBeGreaterThanOrEqual(businessCount);
      expect(publishSpy.mock.calls.length).toBeGreaterThanOrEqual(businessCount);

      unsubscribe();
      publishSpy.mockRestore();
      storesSpy.mockRestore();
    }, 120_000);
  },
);
