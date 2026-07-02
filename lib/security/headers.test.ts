import { afterEach, describe, expect, it, vi } from "vitest";
import { buildContentSecurityPolicy, buildSecurityHeaders } from "@/lib/security/headers";

describe("buildSecurityHeaders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("includes CSP, frame denial, and nosniff", () => {
    vi.stubEnv("NODE_ENV", "development");
    const headers = Object.fromEntries(
      buildSecurityHeaders().map((header) => [header.key, header.value]),
    );

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("adds HSTS in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");

    const headers = Object.fromEntries(
      buildSecurityHeaders().map((header) => [header.key, header.value]),
    );

    expect(headers["Strict-Transport-Security"]).toContain("max-age=");
    expect(buildContentSecurityPolicy()).toContain("upgrade-insecure-requests");
  });
});
