import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { getAutomationLiveRunActionKeys } from "@/lib/automation/run-now-summary";

describe("getAutomationLiveRunActionKeys", () => {
  it("lists configured message-sending actions from the automation config", () => {
    const keys = getAutomationLiveRunActionKeys(DEFAULT_PLATFORM_AUTOMATION_CONFIG);

    expect(keys).toEqual([
      "paymentReminderEmails",
      "whatsAppReminders",
      "followUps",
      "renewalReminders",
      "expiryWarnings",
    ]);
  });

  it("returns an empty list when no outbound actions are enabled", () => {
    const keys = getAutomationLiveRunActionKeys({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      paymentReminders: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
        enabled: false,
      },
      followUps: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.followUps,
        enabled: false,
      },
      expiryRenewal: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.expiryRenewal,
        renewalReminderEnabled: false,
        expiryReminderEnabled: false,
      },
    });

    expect(keys).toEqual([]);
  });

  it("includes invoices and monthly reports when those sections are enabled", () => {
    const keys = getAutomationLiveRunActionKeys({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      invoices: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.invoices,
        autoSendEnabled: true,
      },
      monthlyReports: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.monthlyReports,
        enabled: true,
      },
      paymentReminders: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
        enabled: false,
      },
      followUps: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.followUps,
        enabled: false,
      },
      expiryRenewal: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.expiryRenewal,
        renewalReminderEnabled: false,
        expiryReminderEnabled: false,
      },
    });

    expect(keys).toEqual(["invoices", "monthlyReports"]);
  });
});
