import { describe, expect, it } from "vitest";
import {
  businessMatchesAreaFilter,
  countBusinessesByPaymentStatus,
  getBusinessPaymentStatus,
} from "./admin-portfolio-filters";
import type { BusinessPortfolioRow } from "@/types";

function business(
  overrides: Partial<BusinessPortfolioRow> & Pick<BusinessPortfolioRow, "businessKey">,
): BusinessPortfolioRow {
  return {
    businessName: "Test",
    ownerName: null,
    businessEmail: null,
    businessPhone: null,
    hasBusinessEmail: false,
    storeCount: 1,
    activeStoreCount: 1,
    inactiveStoreCount: 0,
    dataExpiryAt: null,
    renewalDueAt: null,
    ownerLastLoginAt: null,
    stores: [
      {
        storeId: "1",
        storeName: "Store",
        category: "JEWELRY",
        city: "Hyderabad",
        state: "Telangana",
        isActive: true,
        storeManagerName: null,
        storeManagerPhone: null,
        staffCount: 1,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-06-01T00:00:00.000Z",
        deletedAt: null,
        purgeAt: null,
        dataExpiryAt: null,
        renewalDueAt: null,
      },
    ],
    ...overrides,
  };
}

describe("getBusinessPaymentStatus", () => {
  it("marks grace period as due soon", () => {
    expect(
      getBusinessPaymentStatus(
        { renewalDueAt: "2020-01-01T00:00:00.000Z", dataExpiryAt: null },
        new Date("2026-06-05"),
      ),
    ).toBe("DUE_SOON");
  });

  it("marks unpaid after the 10th as overdue", () => {
    expect(
      getBusinessPaymentStatus(
        { renewalDueAt: "2020-01-01T00:00:00.000Z", dataExpiryAt: null },
        new Date("2026-06-15"),
      ),
    ).toBe("OVERDUE");
  });

  it("marks paid current-cycle businesses as current", () => {
    expect(
      getBusinessPaymentStatus(
        { renewalDueAt: "2020-01-01T00:00:00.000Z", dataExpiryAt: null },
        new Date("2026-06-15"),
        "PAID",
        "2026-06-12T00:00:00.000Z",
      ),
    ).toBe("CURRENT");
  });

  it("marks expired data", () => {
    expect(
      getBusinessPaymentStatus(
        { renewalDueAt: "2030-01-01T00:00:00.000Z", dataExpiryAt: "2020-01-01T00:00:00.000Z" },
        new Date("2026-06-01"),
      ),
    ).toBe("EXPIRED");
  });
});

describe("businessMatchesAreaFilter", () => {
  it("matches city and state", () => {
    const row = business({ businessKey: "a" });
    expect(businessMatchesAreaFilter(row, "Hyderabad, Telangana")).toBe(true);
    expect(businessMatchesAreaFilter(row, "Bengaluru, Karnataka")).toBe(false);
  });
});

describe("countBusinessesByPaymentStatus", () => {
  it("counts businesses by payment status after the payment deadline", () => {
    const reference = new Date("2026-06-15");
    const counts = countBusinessesByPaymentStatus(
      [
        business({
          businessKey: "overdue",
          renewalDueAt: "2020-01-01T00:00:00.000Z",
        }),
        business({
          businessKey: "future-dates",
          renewalDueAt: "2030-01-01T00:00:00.000Z",
          dataExpiryAt: "2031-01-01T00:00:00.000Z",
        }),
        business({ businessKey: "unknown" }),
      ],
      reference,
    );

    expect(counts.OVERDUE).toBe(3);
    expect(counts.CURRENT).toBe(0);
  });

  it("counts paid businesses as current", () => {
    const reference = new Date("2026-06-15");
    expect(
      getBusinessPaymentStatus(
        { renewalDueAt: "2020-01-01T00:00:00.000Z", dataExpiryAt: null },
        reference,
        "PAID",
        "2026-06-12T00:00:00.000Z",
      ),
    ).toBe("CURRENT");
  });
});
