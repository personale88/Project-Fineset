import { describe, expect, it } from "vitest";
import {
  AUTOMATION_COUNTRY_CODE_MESSAGE,
  isValidAutomationCountryCode,
  normalizeAutomationCountryCode,
} from "@/lib/automation/country-code";

describe("isValidAutomationCountryCode", () => {
  it("accepts 1 to 4 digit country codes", () => {
    expect(isValidAutomationCountryCode("1")).toBe(true);
    expect(isValidAutomationCountryCode("91")).toBe(true);
    expect(isValidAutomationCountryCode("1234")).toBe(true);
  });

  it("rejects letters and out-of-range lengths", () => {
    expect(isValidAutomationCountryCode("91a")).toBe(false);
    expect(isValidAutomationCountryCode("abcd")).toBe(false);
    expect(isValidAutomationCountryCode("12345")).toBe(false);
    expect(isValidAutomationCountryCode("")).toBe(false);
  });
});

describe("normalizeAutomationCountryCode", () => {
  it("strips non-digit characters from recoverable values", () => {
    expect(normalizeAutomationCountryCode("+91")).toBe("91");
    expect(normalizeAutomationCountryCode(" 1 ")).toBe("1");
  });

  it("returns null for unrecoverable values", () => {
    expect(normalizeAutomationCountryCode("abcd")).toBeNull();
    expect(normalizeAutomationCountryCode("12345")).toBeNull();
    expect(normalizeAutomationCountryCode("")).toBeNull();
  });

  it("exports the automation validation message", () => {
    expect(AUTOMATION_COUNTRY_CODE_MESSAGE).toContain("91");
  });
});
