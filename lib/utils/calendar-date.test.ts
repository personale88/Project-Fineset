import { describe, expect, it } from "vitest";
import {
  compareCalendarDateStrings,
  formatCalendarDate,
  parseCalendarDate,
  startOfCalendarDay,
} from "@/lib/utils/calendar-date";

describe("calendar-date", () => {
  it("formats using local calendar parts, not UTC", () => {
    const date = new Date(2026, 5, 14, 0, 30, 0);
    expect(formatCalendarDate(date)).toBe("2026-06-14");
  });

  it("parses YYYY-MM-DD without shifting to the previous day", () => {
    const parsed = parseCalendarDate("2026-06-14");
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(5);
    expect(parsed.getDate()).toBe(14);
  });

  it("round-trips through format and parse", () => {
    const original = new Date(2026, 0, 31, 23, 59, 0);
    const roundTripped = parseCalendarDate(formatCalendarDate(original));
    expect(roundTripped.getDate()).toBe(31);
    expect(roundTripped.getMonth()).toBe(0);
  });

  it("starts the calendar day at local midnight", () => {
    const start = startOfCalendarDay("2026-06-14");
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(14);
  });

  it("compares calendar date strings", () => {
    expect(compareCalendarDateStrings("2026-06-13", "2026-06-14")).toBeLessThan(0);
  });
});
