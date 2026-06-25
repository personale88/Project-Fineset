import { describe, expect, it } from "vitest";
import {
  buildUpiPaymentUri,
  formatPaymentCountdown,
  resolvePaymentUpiVpa,
} from "@/lib/utils/upi-payment";

describe("buildUpiPaymentUri", () => {
  it("builds a standard UPI deep link", () => {
    const uri = buildUpiPaymentUri({
      vpa: "fineset@paytm",
      payeeName: "FineSet",
      amountInr: 5899,
      transactionNote: "INV-2026-001",
    });

    expect(uri).toContain("upi://pay?");
    expect(uri).toContain("pa=fineset%40paytm");
    expect(uri).toContain("pn=FineSet");
    expect(uri).toContain("am=5899.00");
    expect(uri).toContain("cu=INR");
    expect(uri).toContain("tn=INV-2026-001");
  });
});

describe("resolvePaymentUpiVpa", () => {
  it("prefers configured VPA over env", () => {
    expect(resolvePaymentUpiVpa("billing@upi", "env@upi")).toBe("billing@upi");
  });

  it("returns null when unset", () => {
    expect(resolvePaymentUpiVpa("", "")).toBeNull();
  });
});

describe("formatPaymentCountdown", () => {
  it("formats mm:ss", () => {
    expect(formatPaymentCountdown(905)).toBe("15:05");
    expect(formatPaymentCountdown(59)).toBe("00:59");
    expect(formatPaymentCountdown(0)).toBe("00:00");
  });
});
