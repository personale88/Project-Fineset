import { describe, expect, it } from "vitest";
import {
  adminRouteHasChildPanel,
  adminRouteUsesScopedPageScroll,
  ADMIN_CHILD_PANEL_ROUTE_PREFIXES,
} from "@/lib/admin/admin-dashboard-layout";

describe("admin-dashboard-layout", () => {
  it("lists all scoped admin sections with child panels", () => {
    expect(ADMIN_CHILD_PANEL_ROUTE_PREFIXES).toEqual([
      "/admin/dashboard/settings",
      "/admin/dashboard/accounts",
      "/admin/dashboard/stores",
      "/admin/dashboard/automation",
      "/admin/dashboard/analytics",
    ]);
  });

  it.each([
    "/admin/dashboard/settings",
    "/admin/dashboard/accounts",
    "/admin/dashboard/stores",
    "/admin/dashboard/automation",
    "/admin/dashboard/analytics",
  ])("detects child panel routes (%s)", (pathname) => {
    expect(adminRouteHasChildPanel(pathname)).toBe(true);
  });

  it.each([
    "/admin/dashboard",
    "/admin/dashboard/billing",
    "/admin/dashboard/visits",
    "/admin/dashboard/accounts/store-1",
    "/admin/dashboard/stores/store-1",
  ])("does not apply child panel inset on primary-only routes (%s)", (pathname) => {
    expect(adminRouteHasChildPanel(pathname)).toBe(false);
  });

  it.each([
    "/admin/dashboard/settings",
    "/admin/dashboard/accounts",
    "/admin/dashboard/automation",
  ])("uses scoped internal scroll on list routes (%s)", (pathname) => {
    expect(adminRouteUsesScopedPageScroll(pathname)).toBe(true);
  });

  it.each([
    "/admin/dashboard",
    "/admin/dashboard/billing",
    "/admin/dashboard/analytics",
    "/admin/dashboard/accounts/store-1",
    "/admin/dashboard/visits",
  ])("uses outer scroll on non-scoped routes (%s)", (pathname) => {
    expect(adminRouteUsesScopedPageScroll(pathname)).toBe(false);
  });
});
