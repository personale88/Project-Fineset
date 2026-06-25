import { describe, expect, it } from "vitest";
import { isAnalyticsCreditUpiConfigured } from "@/lib/services/analytics-credit-payment-submissions";

describe("isAnalyticsCreditUpiConfigured", () => {
  it("returns false when settings and env UPI are empty", () => {
    expect(isAnalyticsCreditUpiConfigured("")).toBe(false);
    expect(isAnalyticsCreditUpiConfigured("   ")).toBe(false);
  });

  it("returns true when platform settings include a UPI VPA", () => {
    expect(isAnalyticsCreditUpiConfigured("merchant@upi")).toBe(true);
  });

  it("falls back to BILLING_UPI_VPA env when settings are empty", () => {
    const previous = process.env.BILLING_UPI_VPA;
    process.env.BILLING_UPI_VPA = "env@upi";
    try {
      expect(isAnalyticsCreditUpiConfigured("")).toBe(true);
    } finally {
      if (previous === undefined) {
        delete process.env.BILLING_UPI_VPA;
      } else {
        process.env.BILLING_UPI_VPA = previous;
      }
    }
  });
});
