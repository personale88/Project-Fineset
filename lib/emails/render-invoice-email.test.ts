import { describe, expect, it } from "vitest";
import {
  buildInvoiceNumber,
  renderInvoiceEmailHtml,
  renderInvoiceEmailText,
} from "@/lib/emails/render-invoice-email";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";

describe("buildInvoiceNumber", () => {
  it("builds a stable invoice id from business key and date", () => {
    expect(
      buildInvoiceNumber("owner@royal-time.local", new Date("2026-06-21T12:00:00Z")),
    ).toBe("INV-20260621-OWNERROY");
  });
});

describe("renderInvoiceEmail", () => {
  const billing = calculateBusinessMonthlyBilling([
    { storeId: "1", storeName: "Royal Watches Bandra", staffCount: 5 },
    { storeId: "2", storeName: "Royal Watches Andheri", staffCount: 12 },
  ]);

  const content = {
    invoiceNumber: "INV-20260621-TEST",
    invoiceDate: "21 Jun 2026",
    businessName: "Royal Watches",
    ownerName: "Rajesh Malhotra",
    businessEmail: "owner@royal-time.local",
    renewalDue: "09 Jun 2026",
    dataExpiry: "16 Feb 2027",
    paymentStatus: "Overdue",
    siteUrl: "http://localhost:3000",
    billing,
  };

  it("renders html with priced line items and totals", () => {
    const html = renderInvoiceEmailHtml(content);
    expect(html).toContain("INV-20260621-TEST");
    expect(html).toContain("Royal Watches Bandra");
    expect(html).toContain("Excl. GST");
    expect(html).toContain("Total due (monthly, incl. GST)");
    expect(html).toContain("support@fineset.in");
  });

  it("renders plain text invoice with GST breakdown", () => {
    const text = renderInvoiceEmailText(content);
    expect(text).toContain("owner@royal-time.local");
    expect(text).toContain("Subtotal (excl. GST):");
    expect(text).toContain("GST (18%):");
    expect(text).toContain("Total due (incl. GST):");
  });
});
