import { describe, expect, it } from "vitest";
import { resolvePortalBillingBanner } from "@/lib/utils/portal-billing-banner";

const copy = {
  restrictedTitle: "Subscription payment overdue",
  restrictedBodyOnePeriod: "Due on {deadline}.",
  restrictedBodyMultiPeriod: "{count} periods unpaid ({amount}).",
  restrictedEntryHintOnePeriod: "First period hint.",
  restrictedEntryHintMultiPeriod: "Multi period hint.",
  restrictedCriticalTitle: "Critical overdue",
  restrictedCriticalBody: "{count} periods ({amount}).",
  staffOverdueInfoTitle: "Owner action needed",
  staffOverdueInfoBody: "Your access stays active.",
};

describe("resolvePortalBillingBanner", () => {
  it("shows staff info banner when leaders restricted but staff is not", () => {
    const banner = resolvePortalBillingBanner({
      role: "STAFF",
      billingRestricted: false,
      restrictionTier: "LEADERS_RESTRICTED_STAFF_OK",
      consecutiveUnpaidPeriods: 2,
      paymentDeadlineLabel: "Jun 18",
      outstandingGrandTotal: 35_400,
      unpaidPeriodCount: 3,
      copy,
    });
    expect(banner.showStaffInfoBanner).toBe(true);
    expect(banner.showRestrictionBanner).toBe(false);
  });

  it("escalates owner banner after two overdue periods", () => {
    const banner = resolvePortalBillingBanner({
      role: "BUSINESS_OWNER",
      billingRestricted: true,
      restrictionTier: "LEADERS_RESTRICTED_STAFF_OK",
      consecutiveUnpaidPeriods: 2,
      paymentDeadlineLabel: "Jun 18",
      outstandingGrandTotal: 35_400,
      unpaidPeriodCount: 3,
      copy,
    });
    expect(banner.showRestrictionBanner).toBe(true);
    expect(banner.tone).toBe("error");
    expect(banner.body).toContain("₹35,400");
  });
});
