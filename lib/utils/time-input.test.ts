import { describe, expect, it } from "vitest";
import {
  AUTOMATION_TIME_FORMAT_MESSAGE,
  coerceFormTimeValue,
  formatTimeForInput,
  isValidTimeInput,
  normalizeTimeInput,
  parseTimeInput,
} from "@/lib/utils/time-input";

describe("coerceFormTimeValue", () => {
  it("returns valid Date instances unchanged", () => {
    const date = new Date("2026-06-18T04:30:00.000Z");
    expect(coerceFormTimeValue(date)).toBe(date);
  });

  it("parses ISO strings from localStorage drafts", () => {
    const coerced = coerceFormTimeValue("2026-06-18T04:30:00.000Z");
    expect(coerced).toBeInstanceOf(Date);
    expect(coerced?.getTime()).toBe(new Date("2026-06-18T04:30:00.000Z").getTime());
  });

  it("returns undefined for invalid values", () => {
    expect(coerceFormTimeValue("not-a-date")).toBeUndefined();
    expect(coerceFormTimeValue(null)).toBeUndefined();
    expect(coerceFormTimeValue(undefined)).toBeUndefined();
  });
});

describe("formatTimeForInput", () => {
  it("formats Date values", () => {
    const date = new Date("2026-01-01T14:05:00");
    expect(formatTimeForInput(date)).toMatch(/^\d{2}:\d{2}$/);
  });

  it("formats ISO strings without throwing", () => {
    expect(formatTimeForInput("2026-06-18T04:30:00.000Z")).toMatch(/^\d{2}:\d{2}$/);
  });

  it("returns an empty string for invalid values", () => {
    expect(formatTimeForInput(undefined)).toBe("");
    expect(formatTimeForInput("invalid")).toBe("");
  });
});

describe("parseTimeInput", () => {
  it("parses HH:mm into a Date on the base day", () => {
    const base = new Date("2026-06-18T12:00:00");
    const parsed = parseTimeInput("09:15", base);
    expect(parsed.getHours()).toBe(9);
    expect(parsed.getMinutes()).toBe(15);
  });
});

describe("isValidTimeInput", () => {
  it("accepts valid 24h times", () => {
    expect(isValidTimeInput("09:30")).toBe(true);
    expect(isValidTimeInput("23:59")).toBe(true);
  });

  it("rejects invalid times", () => {
    expect(isValidTimeInput("9:00")).toBe(false);
    expect(isValidTimeInput("24:00")).toBe(false);
    expect(isValidTimeInput("")).toBe(false);
  });
});

describe("normalizeTimeInput", () => {
  it("normalizes single-digit hour and minute values", () => {
    expect(normalizeTimeInput("9:00")).toBe("09:00");
    expect(normalizeTimeInput("18:0")).toBe("18:00");
  });

  it("returns already valid values unchanged", () => {
    expect(normalizeTimeInput("09:00")).toBe("09:00");
  });

  it("returns null for unrecoverable values", () => {
    expect(normalizeTimeInput("bad")).toBeNull();
    expect(normalizeTimeInput("25:00")).toBeNull();
    expect(normalizeTimeInput("")).toBeNull();
  });

  it("exports the automation validation message", () => {
    expect(AUTOMATION_TIME_FORMAT_MESSAGE).toContain("09:00");
  });
});
