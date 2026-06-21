import { afterEach, describe, expect, it, vi } from "vitest";
import { isLocalAuthBypassEnabled } from "@/lib/auth/dev-auth-bypass";

describe("isLocalAuthBypassEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is disabled in production NODE_ENV", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled()).toBe(false);
  });

  it("is disabled on Vercel production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DEV_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled()).toBe(false);
  });

  it("is enabled only when DEV_AUTH_BYPASS is true in dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_AUTH_BYPASS", "true");
    expect(isLocalAuthBypassEnabled()).toBe(true);
  });

  it("is disabled when DEV_AUTH_BYPASS is unset", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_AUTH_BYPASS", "");
    expect(isLocalAuthBypassEnabled()).toBe(false);
  });
});
