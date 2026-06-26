import { describe, expect, it } from "vitest";
import {
  getDayOfMonthInTimezone,
  getHourInTimezone,
  isValidIanaTimezone,
  shouldRunAtHourInTimezone,
  shouldRunMonthlyReportWindow,
  shouldRunOnDayInTimezone,
} from "@/lib/automation/timezone";

describe("automation timezone helpers", () => {
  it("validates IANA timezones", () => {
    expect(isValidIanaTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaTimezone("UTC")).toBe(true);
    expect(isValidIanaTimezone("Not/A_Timezone")).toBe(false);
    expect(isValidIanaTimezone("ABC")).toBe(false);
  });

  it("reads day of month in timezone", () => {
    const reference = new Date("2026-06-05T18:30:00.000Z");
    expect(getDayOfMonthInTimezone("Asia/Kolkata", reference)).toBe(6);
    expect(getDayOfMonthInTimezone("UTC", reference)).toBe(5);
  });

  it("matches configured local hour", () => {
    const reference = new Date("2026-06-05T03:30:00.000Z");
    expect(getHourInTimezone("Asia/Kolkata", reference)).toBe(9);
    expect(shouldRunAtHourInTimezone(9, "Asia/Kolkata", reference)).toBe(true);
  });

  it("matches configured local day", () => {
    const reference = new Date("2026-06-04T18:30:00.000Z");
    expect(shouldRunOnDayInTimezone(5, "Asia/Kolkata", reference)).toBe(true);
  });

  it("EC-AUTO-057 allows monthly report on or after configured local hour", () => {
    const hourNine = new Date("2026-06-05T03:30:00.000Z");
    const hourTen = new Date("2026-06-05T04:30:00.000Z");
    const hourEight = new Date("2026-06-05T02:30:00.000Z");

    expect(shouldRunMonthlyReportWindow(9, "Asia/Kolkata", hourNine)).toBe(true);
    expect(shouldRunMonthlyReportWindow(9, "Asia/Kolkata", hourTen)).toBe(true);
    expect(shouldRunMonthlyReportWindow(9, "Asia/Kolkata", hourEight)).toBe(false);
  });
});
