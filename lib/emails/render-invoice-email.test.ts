import { describe, expect, it } from "vitest";
import {
  formatInvoiceDatePart,
  formatInvoiceNumber,
  generateProvisionalInvoiceRef,
  invoiceNumberPrefix,
  randomInvoiceSuffix,
  renderInvoiceEmailHtml,
  renderInvoiceEmailText,
} from "@/lib/emails/render-invoice-email";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";

describe("formatInvoiceNumber", () => {
  const reference = new Date("2026-07-24T12:00:00");

  it("formats INV + DDMMYYYY + numeric suffix without zero padding", () => {
    expect(formatInvoiceDatePart(reference)).toBe("24072026");
    expect(invoiceNumberPrefix(reference)).toBe("INV24072026");
    expect(formatInvoiceNumber(reference, 48291)).toBe("INV2407202648291");
    expect(formatInvoiceNumber(reference, 42)).toBe("INV2407202642");
  });

  it("generates five-digit random suffixes", () => {
    const suffix = randomInvoiceSuffix();
    expect(suffix).toBeGreaterThanOrEqual(10_000);
    expect(suffix).toBeLessThanOrEqual(99_999);
  });

  it("builds provisional refs with random suffixes", () => {
    const ref = generateProvisionalInvoiceRef(reference);
    expect(ref.startsWith("INV24072026")).toBe(true);
    expect(ref).toMatch(/^INV24072026\d{4,6}$/);
    expect(ref.endsWith("0000")).toBe(false);
  });
});

describe("renderInvoiceEmail", () => {
  const billing = calculateBusinessMonthlyBilling([
    { storeId: "1", storeName: "Royal Watches Bandra", staffCount: 5 },
    { storeId: "2", storeName: "Royal Watches Andheri", staffCount: 12 },
  ]);

  const content = {
    invoiceNumber: "INV2407202648291",
    invoiceDate: "21 Jun 2026",
    businessName: "Royal Watches",
    ownerName: "Rajesh Malhotra",
    businessEmail: "owner@royal-time.local",
    renewalDue: "09 Jun 2026",
    dataExpiry: "16 Feb 2027",
    paymentStatus: "Overdue",
    siteUrl: "https://app.example.com",
    billing,
  };

  it("renders invoice html with invoice number", () => {
    const html = renderInvoiceEmailHtml(content);
    expect(html).toContain("INV2407202648291");
    expect(html).toContain("https://app.example.com");
  });

  it("omits contact footer when showContactFooter is false", () => {
    const html = renderInvoiceEmailHtml({ ...content, showContactFooter: false });
    expect(html).not.toContain("https://app.example.com");
    expect(html).not.toContain('class="footer"');
  });

  it("renders invoice text with invoice number", () => {
    const text = renderInvoiceEmailText(content);
    expect(text).toContain("INV2407202648291");
  });
});
