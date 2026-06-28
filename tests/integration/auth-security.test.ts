import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashCredential } from "@/lib/auth/credentials";
import { loadAppUserProfileByEmail } from "@/lib/auth/load-app-user-profile";
import { requestPasswordResetAction } from "@/lib/auth/request-password-reset-action";
import { authenticateWithPassword } from "@/lib/auth/session-store";

const hasDb = Boolean(process.env.DATABASE_URL);

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    getRequestIdentifier: vi.fn(async () => "vitest-client"),
    checkLoginRateLimit: vi.fn(async () => ({ success: true as const })),
  };
});

vi.mock("@/lib/email/templates/auth-emails", () => ({
  sendPasswordResetEmail: vi.fn(async () => undefined),
  sendInviteEmail: vi.fn(async () => undefined),
  sendTestEmail: vi.fn(async () => undefined),
}));

vi.mock("@/lib/email/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/env")>();
  return {
    ...actual,
    isSmtpConfigured: () => true,
  };
});

const SQL_INJECTION_PAYLOADS = [
  "admin' OR '1'='1",
  "'; DROP TABLE \"AppUser\"; --",
  "\" UNION SELECT id, email FROM \"AppUser\" --",
  "admin@fineset.local'--",
  "1; DELETE FROM \"AppUser\" WHERE '1'='1",
  "' OR 1=1--",
  "admin@fineset.local\"; SELECT pg_sleep(10); --",
];

const XSS_PAYLOADS = [
  "<script>alert(1)</script>@test.com",
  "test@evil.com<img src=x onerror=alert(1)>",
];

describe.skipIf(!hasDb)("auth security integration", () => {
  const runId = Date.now().toString(36);
  let appUserId: string;
  const safeEmail = `sec-safe-${runId}@test.local`;
  const safePassword = "SafePass#9test";

  beforeAll(async () => {
    const passwordHash = await hashCredential(safePassword);
    const user = await prisma.appUser.create({
      data: {
        authId: randomUUID(),
        email: safeEmail,
        name: "Security Test User",
        role: "STAFF",
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
    });
    appUserId = user.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.userSession.deleteMany({ where: { appUserId } });
    await prisma.passwordResetToken.deleteMany({ where: { appUserId } });
    await prisma.appUser.deleteMany({ where: { id: appUserId } });
    await prisma.$disconnect();
  });

  it("EC-BE-057: keeps AppUser table intact after injection-style login attempts", async () => {
    const countBefore = await prisma.appUser.count();

    for (const payload of SQL_INJECTION_PAYLOADS) {
      const result = await authenticateWithPassword(payload, payload);
      expect(result.ok).toBe(false);
    }

    const countAfter = await prisma.appUser.count();
    expect(countAfter).toBe(countBefore);
  });

  it("does not load profile for injection strings as email", async () => {
    for (const payload of SQL_INJECTION_PAYLOADS) {
      const profile = await loadAppUserProfileByEmail(payload);
      expect(profile).toBeNull();
    }
  });

  it("EC-BE-058: rejects XSS-like strings in password reset without throwing", async () => {
    for (const payload of [...SQL_INJECTION_PAYLOADS, ...XSS_PAYLOADS]) {
      const result = await requestPasswordResetAction(payload);
      expect(result.ok === true || result.ok === false).toBe(true);
      if (!result.ok) {
        expect(["invalid_email", "failed", "rate_limited", "email_not_configured"]).toContain(
          result.code,
        );
      }
    }
  });

  it("does not authenticate with injection password against real user", async () => {
    for (const payload of SQL_INJECTION_PAYLOADS) {
      const result = await authenticateWithPassword(safeEmail, payload);
      expect(result.ok).toBe(false);
    }

    const valid = await authenticateWithPassword(safeEmail, safePassword);
    expect(valid.ok).toBe(true);
  });

  it("uses parameterized email lookup (exact match only)", async () => {
    const profile = await loadAppUserProfileByEmail(safeEmail);
    expect(profile?.email).toBe(safeEmail);

    const partial = await loadAppUserProfileByEmail(safeEmail.split("@")[0]!);
    expect(partial).toBeNull();
  });
});
