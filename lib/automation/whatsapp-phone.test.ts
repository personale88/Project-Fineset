import { describe, expect, it } from "vitest";
import {
  formatNormalizedWhatsAppPhone,
  resolveWhatsAppPhoneForBusiness,
} from "@/lib/automation/whatsapp-phone";
import type { BusinessPortfolioRow } from "@/types";

function businessWithPhone(phone: string | null): Pick<BusinessPortfolioRow, "stores"> {
  return {
    stores: [
      {
        storeId: "store-1",
        storeName: "Test Store",
        category: "JEWELRY",
        city: "Mumbai",
        state: "MH",
        isActive: true,
        businessOwnerName: "Owner",
        businessOwnerEmail: "owner@test.local",
        storeManagerName: null,
        storeManagerPhone: phone,
        staffCount: 0,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
        deletedAt: null,
        purgeAt: null,
        dataExpiryAt: null,
        renewalDueAt: null,
        ownerLastLoginAt: null,
      },
    ],
  };
}

describe("resolveWhatsAppPhoneForBusiness", () => {
  it("normalizes local numbers with the configured default country code", () => {
    expect(resolveWhatsAppPhoneForBusiness(businessWithPhone("9876543210"), "91")).toEqual({
      raw: "9876543210",
      normalized: "919876543210",
    });
    expect(resolveWhatsAppPhoneForBusiness(businessWithPhone("5551234567"), "1")).toEqual({
      raw: "5551234567",
      normalized: "15551234567",
    });
  });

  it("returns null when no phone is on file", () => {
    expect(resolveWhatsAppPhoneForBusiness(businessWithPhone(null), "91")).toBeNull();
  });
});

describe("formatNormalizedWhatsAppPhone", () => {
  it("prefixes the normalized digits with plus", () => {
    expect(formatNormalizedWhatsAppPhone("15551234567")).toBe("+15551234567");
  });
});
