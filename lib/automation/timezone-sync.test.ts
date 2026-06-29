import { describe, expect, it } from "vitest";
import {
  formatAutomationTimezoneDriftMessage,
  formatAutomationTimezoneHint,
  hasAutomationTimezoneDrift,
  normalizeAutomationTimezone,
  resolvePlatformDefaultTimezone,
} from "@/lib/automation/timezone-sync";

describe("timezone-sync", () => {
  it("normalizes whitespace in timezone values", () => {
    expect(normalizeAutomationTimezone("  Asia/Kolkata  ")).toBe("Asia/Kolkata");
  });

  it("falls back to the automation default when platform timezone is empty", () => {
    expect(resolvePlatformDefaultTimezone("")).toBe("Asia/Kolkata");
    expect(resolvePlatformDefaultTimezone(null)).toBe("Asia/Kolkata");
  });

  it("detects drift between automation and platform timezones", () => {
    expect(hasAutomationTimezoneDrift("Asia/Kolkata", "America/New_York")).toBe(true);
    expect(hasAutomationTimezoneDrift("Asia/Kolkata", "Asia/Kolkata")).toBe(false);
    expect(hasAutomationTimezoneDrift(" Asia/Kolkata ", "Asia/Kolkata")).toBe(false);
  });

  it("formats hint and drift copy with timezone placeholders", () => {
    expect(
      formatAutomationTimezoneHint(
        "Platform default: {platformTimezone} (Master Settings).",
        "America/New_York",
      ),
    ).toBe("Platform default: America/New_York (Master Settings).");

    expect(
      formatAutomationTimezoneDriftMessage(
        "Automation timezone ({automationTimezone}) differs from Master Settings ({platformTimezone}).",
        "Asia/Kolkata",
        "America/New_York",
      ),
    ).toBe(
      "Automation timezone (Asia/Kolkata) differs from Master Settings (America/New_York).",
    );
  });
});
