// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("apiFetch unauthorized handling", () => {
  beforeEach(() => {
    vi.resetModules();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        pathname: "/staff/dashboard",
        search: "",
        origin: "http://localhost:3000",
        assign: vi.fn(),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("does not redirect to sign-in from non-admin portal pages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const redirectSpy = vi.fn();
    vi.doMock("@/lib/auth/client-session-guard", () => ({
      isAdminPortalPagePath: (pathname: string) => pathname.startsWith("/admin/dashboard"),
      redirectToSignInAfterUnauthorized: redirectSpy,
    }));

    const { apiFetch } = await import("@/lib/api/client");

    await expect(apiFetch("/api/staff/work-queue?limit=30")).rejects.toMatchObject({
      status: 401,
    });
    expect(redirectSpy).not.toHaveBeenCalled();
  });

  it("redirects to sign-in from admin portal pages", async () => {
    window.location.pathname = "/admin/dashboard/automation";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const redirectSpy = vi.fn();
    vi.doMock("@/lib/auth/client-session-guard", () => ({
      isAdminPortalPagePath: (pathname: string) => pathname.startsWith("/admin/dashboard"),
      redirectToSignInAfterUnauthorized: redirectSpy,
    }));

    const { apiFetch } = await import("@/lib/api/client");

    await expect(apiFetch("/api/admin/automation/config")).rejects.toMatchObject({
      status: 401,
    });
    expect(redirectSpy).toHaveBeenCalledWith("/admin/dashboard/automation");
  });
});
