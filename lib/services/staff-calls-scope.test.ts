import { describe, expect, it } from "vitest";
import {
  buildStaffCallActivityDateRange,
  staffCallUsesActionQueueScope,
  staffCallUsesOccasionOnlyScope,
} from "@/lib/services/staff-calls-scope";

describe("staff-calls-scope", () => {
  it("uses occasion-only scope without activity date bounds", () => {
    expect(
      staffCallUsesOccasionOnlyScope({
        queue: "ALL",
        birthday: "THIS_MONTH",
        anniversary: "ALL",
        year: 2026,
        month: 6,
      }),
    ).toBe(true);

    expect(
      buildStaffCallActivityDateRange({
        queue: "ALL",
        birthday: "THIS_MONTH",
        anniversary: "ALL",
        year: 2026,
        month: 6,
      }),
    ).toBeNull();
  });

  it("uses no date bounds for action queues (all pending)", () => {
    expect(
      staffCallUsesActionQueueScope({
        queue: "NOT_ANSWERED",
        birthday: "ALL",
        anniversary: "ALL",
        year: 2026,
        month: 6,
      }),
    ).toBe(true);

    expect(
      buildStaffCallActivityDateRange({
        queue: "FOLLOW_UP",
        birthday: "ALL",
        anniversary: "ALL",
        year: 2026,
        month: 3,
      }),
    ).toBeNull();
  });
});
