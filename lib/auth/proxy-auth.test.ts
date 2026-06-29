import { describe, expect, it } from "vitest";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import { evaluateProxyAuth } from "@/lib/auth/proxy-auth";

const ORIGIN = "http://localhost:3000";

describe("evaluateProxyAuth", () => {
  it("redirects unauthenticated admin dashboard requests to sign-in with callback", () => {
    const result = evaluateProxyAuth(ADMIN_DASHBOARD_PATH, ORIGIN, undefined);

    expect(result).toEqual({
      action: "redirect",
      location: `${ORIGIN}/?callbackUrl=%2Fadmin%2Fdashboard`,
    });
  });

  it("redirects unauthenticated admin sub-routes to sign-in with callback", () => {
    const result = evaluateProxyAuth(
      `${ADMIN_DASHBOARD_PATH}/billing`,
      ORIGIN,
      undefined,
    );

    expect(result).toEqual({
      action: "redirect",
      location: `${ORIGIN}/?callbackUrl=%2Fadmin%2Fdashboard%2Fbilling`,
    });
  });

  it("rejects unauthenticated admin API requests with 401", () => {
    expect(evaluateProxyAuth("/api/admin/settings", ORIGIN, undefined)).toEqual({
      action: "json",
      status: 401,
      message: "Unauthorized",
    });
  });

  it("rejects unauthenticated analytics admin API requests with 401", () => {
    expect(
      evaluateProxyAuth("/api/analytics/admin/credits/grant", ORIGIN, undefined),
    ).toEqual({
      action: "json",
      status: 401,
      message: "Unauthorized",
    });
  });

  it("forbids non-admin roles on admin API routes", () => {
    expect(evaluateProxyAuth("/api/admin/settings", ORIGIN, "STAFF")).toEqual({
      action: "json",
      status: 403,
      message: "Forbidden",
    });
  });

  it("allows master admin portal and API routes", () => {
    expect(evaluateProxyAuth(ADMIN_DASHBOARD_PATH, ORIGIN, "MASTER_ADMIN")).toEqual({
      action: "next",
    });
    expect(evaluateProxyAuth("/api/admin/settings", ORIGIN, "MASTER_ADMIN")).toEqual({
      action: "next",
    });
    expect(
      evaluateProxyAuth("/api/analytics/admin/credits", ORIGIN, "PLATFORM_ADMIN"),
    ).toEqual({
      action: "next",
    });
  });

  it("redirects wrong-role portal users to their dashboard", () => {
    expect(evaluateProxyAuth(ADMIN_DASHBOARD_PATH, ORIGIN, "STAFF")).toEqual({
      action: "redirect",
      location: `${ORIGIN}/staff/dashboard`,
    });
    expect(
      evaluateProxyAuth(`${ADMIN_DASHBOARD_PATH}/automation`, ORIGIN, "STORE_MANAGER"),
    ).toEqual({
      action: "redirect",
      location: `${ORIGIN}/store-manager/dashboard`,
    });
    expect(
      evaluateProxyAuth(`${ADMIN_DASHBOARD_PATH}/automation`, ORIGIN, "BUSINESS_OWNER"),
    ).toEqual({
      action: "redirect",
      location: `${ORIGIN}/business-owner/dashboard`,
    });
  });

  it("forbids store portal roles on admin automation APIs", () => {
    for (const role of ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER"] as const) {
      expect(
        evaluateProxyAuth("/api/admin/automation/config", ORIGIN, role),
      ).toEqual({
        action: "json",
        status: 403,
        message: "Forbidden",
      });
      expect(
        evaluateProxyAuth("/api/admin/automation/runs", ORIGIN, role),
      ).toEqual({
        action: "json",
        status: 403,
        message: "Forbidden",
      });
    }
  });
});
