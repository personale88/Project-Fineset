import { describe, expect, it } from "vitest";
import {
  formatAutomationDaysList,
  normalizeAutomationDaysListInput,
  parseAutomationDaysList,
  sanitizeAutomationConfigSection,
  sanitizeAutomationDaysList,
} from "@/lib/automation/days-list";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";

describe("parseAutomationDaysList", () => {
  it("parses comma-separated day lists", () => {
    expect(parseAutomationDaysList("3, 1, 7")).toEqual([3, 1, 7]);
  });

  it("filters out invalid tokens such as x", () => {
    expect(parseAutomationDaysList("3, x, 1")).toEqual([3, 1]);
  });

  it("filters out negative and out-of-range values", () => {
    expect(parseAutomationDaysList("-1, 3, 99, 1")).toEqual([3, 1]);
  });

  it("limits the list to 10 items", () => {
    expect(parseAutomationDaysList("0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11")).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});

describe("normalizeAutomationDaysListInput", () => {
  it("returns a cleaned comma-separated string", () => {
    expect(normalizeAutomationDaysListInput("3, x, 1")).toBe("3, 1");
  });
});

describe("sanitizeAutomationDaysList", () => {
  it("removes invalid stored values", () => {
    expect(sanitizeAutomationDaysList([3, 99, 1, -2])).toEqual([3, 1]);
  });
});

describe("sanitizeAutomationConfigSection", () => {
  it("sanitizes invalid payment reminder day lists before save", () => {
    expect(
      sanitizeAutomationConfigSection("paymentReminders", {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.paymentReminders,
        reminderDaysBeforeDue: [3, 99, 1],
        reminderDaysAfterDue: [1, -2, 7],
      }).reminderDaysBeforeDue,
    ).toEqual([3, 1]);
  });

  it("normalizes WhatsApp business hours before save", () => {
    expect(
      sanitizeAutomationConfigSection("whatsApp", {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
        businessHoursStart: "9:00",
        businessHoursEnd: "18:0",
      }),
    ).toEqual({
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
      businessHoursStart: "09:00",
      businessHoursEnd: "18:00",
    });
  });

  it("normalizes WhatsApp default country codes before save", () => {
    expect(
      sanitizeAutomationConfigSection("whatsApp", {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp,
        defaultCountryCode: "+1",
      }).defaultCountryCode,
    ).toBe("1");
  });
});

describe("formatAutomationDaysList", () => {
  it("formats sanitized day lists", () => {
    expect(formatAutomationDaysList([3, 99, 1])).toBe("3, 1");
  });
});
