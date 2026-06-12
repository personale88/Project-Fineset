import { describe, expect, it } from "vitest";
import { createVisitSchema } from "@/lib/validations/visit.schema";
import { phoneSchema } from "@/lib/validations/common.schema";

const validPurchasedVisit = {
  customerName: "Jane Doe",
  customerPhone: "9876543210",
  customerType: "NEW" as const,
  visitType: "WALK_IN" as const,
  sourceChannel: "ORGANIC_WALK_IN" as const,
  purchaseStatus: "PURCHASED" as const,
  productsPurchased: ["FINGER_RINGS" as const],
  transactionAmount: 25000,
  schemesPitched: ["GHS" as const],
  enrollmentOutcome: "ENROLLED_GHS" as const,
  monthlyCommitment: 5000,
  followUpNeeded: false,
};

const validNotPurchasedVisit = {
  customerName: "John Doe",
  customerPhone: "9123456780",
  customerType: "REPEAT" as const,
  visitType: "APPOINTMENT" as const,
  sourceChannel: "REFERRAL" as const,
  purchaseStatus: "NOT_PURCHASED" as const,
  productsExplored: ["EAR_RINGS" as const],
  reasonNoPurchase: "BUDGET" as const,
  schemesPitched: ["GHS" as const],
  enrollmentOutcome: "DECLINED" as const,
  reasonNoEnrollment: "NOT_INTERESTED" as const,
  followUpNeeded: false,
};

describe("phoneSchema", () => {
  it("accepts a 10-digit phone number", () => {
    expect(phoneSchema.safeParse("9876543210").success).toBe(true);
  });

  it("rejects invalid phone numbers", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
  });
});

describe("createVisitSchema", () => {
  it("accepts a valid purchased visit", () => {
    const result = createVisitSchema.safeParse(validPurchasedVisit);
    expect(result.success).toBe(true);
  });

  it("accepts a valid not-purchased visit", () => {
    const result = createVisitSchema.safeParse(validNotPurchasedVisit);
    expect(result.success).toBe(true);
  });

  it("accepts a visit with no schemes pitched", () => {
    const result = createVisitSchema.safeParse({
      ...validPurchasedVisit,
      schemesPitched: ["NONE"],
      enrollmentOutcome: undefined,
      monthlyCommitment: undefined,
    });
    expect(result.success).toBe(true);
  });

  it("requires purchase status", () => {
    const withoutStatus = { ...validPurchasedVisit };
    delete (withoutStatus as { purchaseStatus?: string }).purchaseStatus;
    const result = createVisitSchema.safeParse(withoutStatus);
    expect(result.success).toBe(false);
  });

  it("requires transaction amount for purchases", () => {
    const result = createVisitSchema.safeParse({
      ...validPurchasedVisit,
      transactionAmount: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("requires explored products when not purchased", () => {
    const result = createVisitSchema.safeParse({
      ...validNotPurchasedVisit,
      productsExplored: [],
    });
    expect(result.success).toBe(false);
  });

  it("requires follow-up date when follow-up is needed", () => {
    const result = createVisitSchema.safeParse({
      ...validNotPurchasedVisit,
      followUpNeeded: true,
      followUpDate: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("rejects sale dates in the future", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = createVisitSchema.safeParse({
      ...validPurchasedVisit,
      visitDate: tomorrow,
    });
    expect(result.success).toBe(false);
  });

  it("rejects out time before in time", () => {
    const result = createVisitSchema.safeParse({
      ...validPurchasedVisit,
      inTime: new Date("2024-01-01T14:00:00"),
      outTime: new Date("2024-01-01T10:00:00"),
    });
    expect(result.success).toBe(false);
  });
});
