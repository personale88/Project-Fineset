import { afterEach, describe, expect, it, vi } from "vitest";

const PRODUCTION_REQUIRED_KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ENCRYPTION_KEY",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

describe("EC-BE-069: production env validation on startup", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("throws when required production variables are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
    for (const key of PRODUCTION_REQUIRED_KEYS) {
      vi.stubEnv(key, "");
    }
    vi.stubEnv("NEXTAUTH_SECRET", "");

    const { validateEnv } = await import("@/lib/env");

    expect(() => validateEnv()).toThrow(/Missing required production environment variables/);
    expect(() => validateEnv()).toThrow(/DATABASE_URL/);
    expect(() => validateEnv()).toThrow(/AUTH_SECRET/);
    expect(() => validateEnv()).toThrow(/ENCRYPTION_KEY/);
  });

  it("allows startup when SKIP_ENV_VALIDATION is true", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");
    vi.stubEnv("DATABASE_URL", "");

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).not.toThrow();
  });

  it("does not require production secrets in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SKIP_ENV_VALIDATION", "");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("ENCRYPTION_KEY", "");

    const { validateEnv } = await import("@/lib/env");
    expect(() => validateEnv()).not.toThrow();
  });

  it("runs validateEnv from instrumentation register hook", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SKIP_ENV_VALIDATION", "true");

    const validateEnv = vi.fn();
    vi.doMock("@/lib/env", () => ({ validateEnv }));
    vi.resetModules();

    const { register } = await import("@/instrumentation");
    await register();

    expect(validateEnv).toHaveBeenCalledTimes(1);
  });
});
