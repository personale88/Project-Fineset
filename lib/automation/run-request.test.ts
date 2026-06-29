import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import {
  assertManualAutomationRunAllowed,
  AutomationRunBlockedError,
  isAutomationLiveRunAllowedInUi,
} from "@/lib/automation/run-request";

describe("assertManualAutomationRunAllowed", () => {
  const disabledConfig = {
    ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    global: {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
      enabled: false,
    },
  };

  it("allows manual preview runs when automations are disabled", () => {
    expect(() =>
      assertManualAutomationRunAllowed(disabledConfig, {
        trigger: "MANUAL",
        dryRun: true,
      }),
    ).not.toThrow();
  });

  it("blocks manual live runs when automations are disabled", () => {
    expect(() =>
      assertManualAutomationRunAllowed(disabledConfig, {
        trigger: "MANUAL",
        dryRun: false,
      }),
    ).toThrow(AutomationRunBlockedError);
  });

  it("allows cron runs when automations are disabled", () => {
    expect(() =>
      assertManualAutomationRunAllowed(disabledConfig, {
        trigger: "CRON",
      }),
    ).not.toThrow();
  });

  it("allows manual live runs when automations are enabled", () => {
    const enabledConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    expect(() =>
      assertManualAutomationRunAllowed(enabledConfig, {
        trigger: "MANUAL",
        dryRun: false,
      }),
    ).not.toThrow();
  });
});

describe("isAutomationLiveRunAllowedInUi", () => {
  const enabledConfig = {
    ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    global: {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
      enabled: true,
    },
  };

  const disabledConfig = {
    ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
    global: {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
      enabled: false,
    },
  };

  it("blocks live runs when the draft master switch is off", () => {
    expect(isAutomationLiveRunAllowedInUi(disabledConfig, enabledConfig)).toBe(false);
    expect(isAutomationLiveRunAllowedInUi(disabledConfig, disabledConfig)).toBe(false);
  });

  it("blocks live runs when automations are not saved as enabled", () => {
    expect(isAutomationLiveRunAllowedInUi(enabledConfig, disabledConfig)).toBe(false);
  });

  it("allows live runs only when draft and persisted config are enabled", () => {
    expect(isAutomationLiveRunAllowedInUi(enabledConfig, enabledConfig)).toBe(true);
    expect(isAutomationLiveRunAllowedInUi(enabledConfig, undefined)).toBe(true);
  });
});
