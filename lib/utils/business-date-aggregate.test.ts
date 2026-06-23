import { describe, expect, it } from "vitest";
import { earliestDate, latestDate } from "./business-date-aggregate";

describe("business-date-aggregate", () => {
  it("picks earliest calendar date", () => {
    expect(earliestDate(["2026-06-01", "2025-12-01", null])?.toISOString()).toBe(
      new Date("2025-12-01").toISOString(),
    );
  });

  it("picks latest calendar date", () => {
    expect(latestDate(["2026-06-01", "2025-12-01", null])?.toISOString()).toBe(
      new Date("2026-06-01").toISOString(),
    );
  });
});
