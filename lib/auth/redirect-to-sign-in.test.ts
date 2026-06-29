import { describe, expect, it } from "vitest";
import {
  applyExpiredSessionRedirectParams,
  signInRedirectUrl,
} from "@/lib/auth/redirect-to-sign-in";

describe("applyExpiredSessionRedirectParams", () => {
  it("adds session_expired when a stale session cookie had no valid role", () => {
    const destination = signInRedirectUrl(
      "http://localhost:3000",
      "/admin/dashboard/automation",
    );

    applyExpiredSessionRedirectParams(destination, {
      hadSessionToken: true,
      role: undefined,
    });

    expect(destination.searchParams.get("error")).toBe("session_expired");
    expect(destination.searchParams.get("callbackUrl")).toBe("/admin/dashboard/automation");
  });

  it("does not add session_expired for unauthenticated visitors", () => {
    const destination = signInRedirectUrl(
      "http://localhost:3000",
      "/admin/dashboard/automation",
    );

    applyExpiredSessionRedirectParams(destination, {
      hadSessionToken: false,
      role: undefined,
    });

    expect(destination.searchParams.get("error")).toBeNull();
  });
});
