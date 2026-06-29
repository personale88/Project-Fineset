// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError } from "@/types";
import type { redirectToSignInAfterUnauthorized as RedirectFn } from "@/lib/auth/client-session-guard";

describe("client-session-guard", () => {
  let redirectToSignInAfterUnauthorized: typeof RedirectFn;
  let isUnauthorizedApiError: typeof import("@/lib/auth/client-session-guard").isUnauthorizedApiError;
  let isAdminPortalPagePath: typeof import("@/lib/auth/client-session-guard").isAdminPortalPagePath;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/admin/dashboard/automation",
        search: "",
        origin: "http://localhost:3000",
        assign: vi.fn(),
      },
    });

    const sessionGuard = await import("@/lib/auth/client-session-guard");
    redirectToSignInAfterUnauthorized = sessionGuard.redirectToSignInAfterUnauthorized;
    isUnauthorizedApiError = sessionGuard.isUnauthorizedApiError;
    isAdminPortalPagePath = sessionGuard.isAdminPortalPagePath;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects unauthorized API errors", () => {
    expect(isUnauthorizedApiError(new ApiError(401, { message: "Unauthorized" }))).toBe(true);
    expect(isUnauthorizedApiError(new ApiError(403, { message: "Forbidden" }))).toBe(false);
    expect(isUnauthorizedApiError(new Error("nope"))).toBe(false);
  });

  it("detects admin portal page paths", () => {
    expect(isAdminPortalPagePath("/admin/dashboard/automation")).toBe(true);
    expect(isAdminPortalPagePath("/staff/dashboard")).toBe(false);
  });

  it("redirects expired sessions to login with callbackUrl", async () => {
    redirectToSignInAfterUnauthorized("/admin/dashboard/automation");
    await Promise.resolve();

    expect(fetch).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
      credentials: "include",
    });
    expect(window.location.assign).toHaveBeenCalledWith(
      "http://localhost:3000/?error=session_expired&callbackUrl=%2Fadmin%2Fdashboard%2Fautomation",
    );
  });

  it("does not redirect from the login page", () => {
    window.location.pathname = "/";
    redirectToSignInAfterUnauthorized("/admin/dashboard/automation");

    expect(fetch).not.toHaveBeenCalled();
    expect(window.location.assign).not.toHaveBeenCalled();
  });
});
