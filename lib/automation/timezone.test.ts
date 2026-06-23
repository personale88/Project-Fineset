import { describe, expect, it } from "vitest";
import {
  getDayOfMonthInTimezone,
  getHourInTimezone,
  shouldRunAtHourInTimezone,
  shouldRunOnDayInTimezone,
} from "@/lib/automation/timezone";

describe("automation timezone helpers", () => {
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
});
