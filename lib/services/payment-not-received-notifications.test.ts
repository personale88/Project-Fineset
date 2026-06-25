import { describe, expect, it } from "vitest";
import { buildPaymentNotReceivedMessage } from "@/lib/services/payment-not-received-notifications";

describe("buildPaymentNotReceivedMessage", () => {
  it("includes business, amount, and invoice details", () => {
    const message = buildPaymentNotReceivedMessage({
      greetingName: "Alex",
      businessName: "Store Alpha",
      amountInr: 11800,
      invoiceNumber: "INV001",
      platformName: "FineSet",
    });

    expect(message).toContain("Hi Alex,");
    expect(message).toContain("Store Alpha");
    expect(message).toContain("₹11,800");
    expect(message).toContain("INV001");
    expect(message).toContain("FineSet Team");
  });

  it("uses WhatsApp emphasis markers when requested", () => {
    const message = buildPaymentNotReceivedMessage({
      greetingName: "Alex",
      businessName: "Store Alpha",
      amountInr: 11800,
      invoiceNumber: "INV001",
      platformName: "FineSet",
      forWhatsApp: true,
    });

    expect(message).toContain("*Store Alpha*");
    expect(message).toContain("*₹11,800*");
    expect(message).toContain("*INV001*");
  });
});
