import { describe, expect, it } from "vitest";
import {
  currentMonthOccasionRange,
  missedOccasionDateInRange,
  occasionStillNeedsCall,
} from "@/lib/utils/occasion-call-utils";
import { STAFF_AMEND_WINDOW_MS } from "@/lib/services/staff-amend";
import {
  staffAmendFieldSaleSchema,
  staffAmendVisitSchema,
  staffCorrectionRequestSchema,
} from "@/lib/validations/staff-amend.schema";

describe("staff-amend schema", () => {
  it("accepts minimal visit amend payload", () => {
    const parsed = staffAmendVisitSchema.safeParse({
      customerName: "Jane Doe",
      customerPhone: "9876543210",
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts minimal field sale amend payload", () => {
    const parsed = staffAmendFieldSaleSchema.safeParse({
      locationLabel: "Market square",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires visitId or fieldSaleId for correction requests", () => {
    const missing = staffCorrectionRequestSchema.safeParse({
      message: "Please fix the phone number on this record",
    });
    expect(missing.success).toBe(false);

    const valid = staffCorrectionRequestSchema.safeParse({
      visitId: "visit-1",
      message: "Please fix the phone number on this record",
    });
    expect(valid.success).toBe(true);
  });
});

describe("STAFF_AMEND_WINDOW_MS", () => {
  it("is 72 hours", () => {
    expect(STAFF_AMEND_WINDOW_MS).toBe(72 * 60 * 60 * 1000);
  });
});

describe("occasionStillNeedsCall", () => {
  it("returns false when call was answered", () => {
    const range = currentMonthOccasionRange(new Date("2024-06-15T12:00:00Z"));
    const occasion = new Date("1990-06-20T00:00:00Z");

    expect(
      occasionStillNeedsCall(occasion, "ANSWERED", range),
    ).toBe(false);
  });

  it("returns true for unanswered occasion in current month", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    const range = currentMonthOccasionRange(now);
    const occasion = new Date("1990-06-20T00:00:00Z");

    expect(
      occasionStillNeedsCall(occasion, "NOT_ANSWERED", range),
    ).toBe(true);
  });

  it("missedOccasionDateInRange finds June birthday in June range", () => {
    const range = currentMonthOccasionRange(new Date("2024-06-15T12:00:00Z"));
    const birthday = new Date("1985-06-10T00:00:00Z");

    const missed = missedOccasionDateInRange(birthday, range, null);
    expect(missed).not.toBeNull();
    expect(missed!.getMonth()).toBe(5);
    expect(missed!.getDate()).toBe(10);
  });
});
