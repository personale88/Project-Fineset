import { describe, expect, it } from "vitest";
import {
  buildTelHref,
  buildWhatsAppUrl,
  formatSupportPhoneDisplay,
  normalizeWhatsAppPhone,
} from "./whatsapp-link";

describe("normalizeWhatsAppPhone", () => {
  it("adds India country code for 10-digit numbers", () => {
    expect(normalizeWhatsAppPhone("9876543210")).toBe("919876543210");
    expect(normalizeWhatsAppPhone("+91 98765 43210")).toBe("919876543210");
  });

  it("keeps numbers that already include country code", () => {
    expect(normalizeWhatsAppPhone("919876543210")).toBe("919876543210");
  });

  it("returns null for invalid numbers", () => {
    expect(normalizeWhatsAppPhone("123")).toBeNull();
  });

  it("uses a configured default country code for local numbers", () => {
    expect(normalizeWhatsAppPhone("5551234567", "1")).toBe("15551234567");
    expect(normalizeWhatsAppPhone("+1 555 123 4567", "1")).toBe("15551234567");
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds wa.me link with encoded message", () => {
    const url = buildWhatsAppUrl("9876543210", "Hello there");
    expect(url).toBe("https://wa.me/919876543210?text=Hello%20there");
  });

  it("builds wa.me link with a configured country code", () => {
    const url = buildWhatsAppUrl("5551234567", "Hello there", "1");
    expect(url).toBe("https://wa.me/15551234567?text=Hello%20there");
  });
});

describe("buildTelHref", () => {
  it("builds tel link with country code", () => {
    expect(buildTelHref("9876543210")).toBe("tel:+919876543210");
    expect(buildTelHref("+91 98765 43210")).toBe("tel:+919876543210");
  });

  it("returns null for invalid numbers", () => {
    expect(buildTelHref("123")).toBeNull();
  });
});

describe("formatSupportPhoneDisplay", () => {
  it("formats 10-digit Indian numbers", () => {
    expect(formatSupportPhoneDisplay("9876543210")).toBe("+91 98765 43210");
  });

  it("formats numbers that already include country code", () => {
    expect(formatSupportPhoneDisplay("919876543210")).toBe("+91 98765 43210");
    expect(formatSupportPhoneDisplay("+91 98765 43210")).toBe("+91 98765 43210");
  });
});
