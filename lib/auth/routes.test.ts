import { describe, expect, it } from "vitest";
import {
  BUSINESS_OWNER_DASHBOARD_PATH,
  getProtectedApiRouteForPath,
  LEGACY_STORE_DASHBOARD_PATH,
  remapLegacyPortalPath,
  resolveLegacyDashboardRedirect,
  resolvePostAuthRedirect,
  STORE_MANAGER_DASHBOARD_PATH,
  STAFF_DASHBOARD_PATH,
} from "@/lib/auth/routes";

describe("portal routes", () => {
  it("redirects each role to its dashboard", () => {
    expect(resolvePostAuthRedirect("STAFF")).toBe(STAFF_DASHBOARD_PATH);
    expect(resolvePostAuthRedirect("STORE_MANAGER")).toBe(
      STORE_MANAGER_DASHBOARD_PATH,
    );
    expect(resolvePostAuthRedirect("BUSINESS_OWNER")).toBe(
      BUSINESS_OWNER_DASHBOARD_PATH,
    );
  });

  it("accepts callback URLs only for the matching portal", () => {
    expect(
      resolvePostAuthRedirect(
        "STORE_MANAGER",
        `${STORE_MANAGER_DASHBOARD_PATH}/visits`,
      ),
    ).toBe(`${STORE_MANAGER_DASHBOARD_PATH}/visits`);

    expect(
      resolvePostAuthRedirect(
        "STORE_MANAGER",
        `${BUSINESS_OWNER_DASHBOARD_PATH}/visits`,
      ),
    ).toBe(STORE_MANAGER_DASHBOARD_PATH);
  });

  it("remaps legacy /store/dashboard callbacks per role", () => {
    expect(
      remapLegacyPortalPath(`${LEGACY_STORE_DASHBOARD_PATH}/visits`, "STORE_MANAGER"),
    ).toBe(`${STORE_MANAGER_DASHBOARD_PATH}/visits`);

    expect(
      remapLegacyPortalPath(`${LEGACY_STORE_DASHBOARD_PATH}/staff`, "BUSINESS_OWNER"),
    ).toBe(`${BUSINESS_OWNER_DASHBOARD_PATH}/staff`);
  });

  it("resolves legacy dashboard paths for unauthenticated redirects", () => {
    expect(
      resolveLegacyDashboardRedirect(`${LEGACY_STORE_DASHBOARD_PATH}/calls`),
    ).toBe(`${BUSINESS_OWNER_DASHBOARD_PATH}/calls`);

    expect(
      resolveLegacyDashboardRedirect(
        `${LEGACY_STORE_DASHBOARD_PATH}/field-sales`,
        "STORE_MANAGER",
      ),
    ).toBe(`${STORE_MANAGER_DASHBOARD_PATH}/field-sales`);
  });

  it("maps protected admin API routes to MASTER_ADMIN and PLATFORM_ADMIN", () => {
    expect(getProtectedApiRouteForPath("/api/admin/billing/summaries")?.roles).toEqual([
      "MASTER_ADMIN",
      "PLATFORM_ADMIN",
    ]);
    expect(getProtectedApiRouteForPath("/api/stores")?.roles).toEqual([
      "MASTER_ADMIN",
      "PLATFORM_ADMIN",
    ]);
    expect(getProtectedApiRouteForPath("/api/audit")?.roles).toContain("MASTER_ADMIN");
    expect(getProtectedApiRouteForPath("/api/audit")?.roles).toContain("PLATFORM_ADMIN");
    expect(getProtectedApiRouteForPath("/api/audit")?.roles).toContain("BUSINESS_OWNER");
    expect(getProtectedApiRouteForPath("/api/billing/payment-submissions")?.roles).toContain(
      "BUSINESS_OWNER",
    );
    expect(getProtectedApiRouteForPath("/api/customers")?.roles).toContain("STAFF");
    expect(getProtectedApiRouteForPath("/api/import/execute")?.roles).toContain(
      "STORE_MANAGER",
    );
  });
});
