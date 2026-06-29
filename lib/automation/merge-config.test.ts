import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { mergeAutomationConfig } from "@/lib/automation/merge-config";
import type { PlatformAutomationConfig } from "@/lib/automation/types";

describe("mergeAutomationConfig", () => {
  it("merges one section without resetting other sections", () => {
    const base: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      invoices: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.invoices,
        autoSendEnabled: false,
        sendDayOfMonth: 12,
      },
      paymentReminders: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
        maxRemindersPerCycle: 9,
      },
    };

    const merged = mergeAutomationConfig(
      { paymentReminders: { enabled: true, maxRemindersPerCycle: 4 } },
      base,
    );

    expect(merged.invoices).toEqual(base.invoices);
    expect(merged.paymentReminders.enabled).toBe(true);
    expect(merged.paymentReminders.maxRemindersPerCycle).toBe(4);
  });

  it("preserves partial section updates when patching a single field", () => {
    const base: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
        dryRunMode: false,
        timezone: "Asia/Kolkata",
      },
    };

    const merged = mergeAutomationConfig({ global: { dryRunMode: true } }, base);

    expect(merged.global.enabled).toBe(true);
    expect(merged.global.dryRunMode).toBe(true);
    expect(merged.global.timezone).toBe("Asia/Kolkata");
  });
});
