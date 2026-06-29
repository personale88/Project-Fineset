import { describe, expect, it } from "vitest";
import { shouldRedirectPlatformAdminWithoutBilling } from "@/lib/auth/require-admin-billing-page";
import type { AdminSession } from "@/types";

describe("shouldRedirectPlatformAdminWithoutBilling", () => {
  it("does not redirect master admins", () => {
    const session: AdminSession = {
      role: "MASTER_ADMIN",
      userId: "master",
      email: "master@test.local",
      permissions: {},
    };

    expect(shouldRedirectPlatformAdminWithoutBilling(session)).toBe(false);
  });

  it("does not redirect platform admins with billing permission", () => {
    const session: AdminSession = {
      role: "PLATFORM_ADMIN",
      userId: "platform",
      email: "platform@test.local",
      permissions: { billing: true, portfolio: true },
    };

    expect(shouldRedirectPlatformAdminWithoutBilling(session)).toBe(false);
  });

  it("redirects platform admins without billing permission", () => {
    const session: AdminSession = {
      role: "PLATFORM_ADMIN",
      userId: "platform",
      email: "platform@test.local",
      permissions: { portfolio: true, accounts: true, analytics: true },
    };

    expect(shouldRedirectPlatformAdminWithoutBilling(session)).toBe(true);
  });
});
