import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import { computeOnboardingDefaultDates } from "@/lib/platform/onboarding-dates";

describe("computeOnboardingDefaultDates", () => {
  it("adds configured months from the reference date", () => {
    const reference = new Date("2026-01-15T12:00:00Z");
    const dates = computeOnboardingDefaultDates(
      DEFAULT_PLATFORM_SETTINGS.onboarding,
      reference,
    );

    expect(dates.renewalDueAt).toBe("2027-01-15");
    expect(dates.dataExpiryAt).toBe("2027-01-15");
  });
});
