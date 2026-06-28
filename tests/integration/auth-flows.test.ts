import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashCredential } from "@/lib/auth/credentials";
import { inviteUser } from "@/lib/auth/invite-user";
import { requestPasswordResetAction } from "@/lib/auth/request-password-reset-action";
import { setPasswordAction } from "@/lib/auth/set-password-action";
import {
  authenticateWithPassword,
  deleteAllSessionsForUser,
} from "@/lib/auth/session-store";
import { verifySmtpConnection } from "@/lib/email/send-mail";
import { isSmtpConfigured } from "@/lib/email/env";

const hasDb = Boolean(process.env.DATABASE_URL);

let capturedResetToken: string | null = null;
let capturedInviteToken: string | null = null;

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    getRequestIdentifier: vi.fn(async () => "vitest-client"),
    checkLoginRateLimit: vi.fn(async () => ({ success: true as const })),
  };
});

vi.mock("@/lib/email/templates/auth-emails", () => ({
  sendPasswordResetEmail: vi.fn(async (_email: string, token: string) => {
    capturedResetToken = token;
  }),
  sendInviteEmail: vi.fn(async (_email: string, _name: string, token: string) => {
    capturedInviteToken = token;
  }),
  sendTestEmail: vi.fn(async () => undefined),
}));

vi.mock("@/lib/email/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email/env")>();
  return {
    ...actual,
    isSmtpConfigured: () => true,
  };
});

describe.skipIf(!hasDb)("auth flows integration", () => {
  const runId = Date.now().toString(36);
  let storeId: string;
  let staffAppUserId: string;
  const staffEmail = `auth-staff-${runId}@test.local`;
  const inviteEmail = `auth-invite-${runId}@test.local`;
  const newPassword = "AuthFlow#9test";

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: { name: `Auth Flow Store ${runId}`, city: "Mumbai", state: "MH" },
    });
    storeId = store.id;

    const staff = await prisma.staff.create({
      data: {
        name: "Auth Flow Staff",
        employeeId: `AF${runId}`,
        storeId,
        role: "STAFF",
        isActive: true,
      },
    });

    const passwordHash = await hashCredential("StartPass#9test");
    const appUser = await prisma.appUser.create({
      data: {
        authId: randomUUID(),
        email: staffEmail,
        name: staff.name,
        role: "STAFF",
        storeId,
        staffId: staff.id,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
    });
    staffAppUserId = appUser.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.inviteToken.deleteMany({
      where: { appUser: { email: { contains: runId } } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { appUser: { email: { contains: runId } } },
    });
    await prisma.userSession.deleteMany({
      where: { appUser: { email: { contains: runId } } },
    });
    await prisma.appUser.deleteMany({ where: { email: { contains: runId } } });
    await prisma.staff.deleteMany({ where: { employeeId: { contains: runId } } });
    await prisma.store.deleteMany({ where: { id: storeId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("authenticates active user with correct password", async () => {
    const result = await authenticateWithPassword(staffEmail, "StartPass#9test");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.role).toBe("STAFF");
    }
  });

  it("EC-BE-059: rejects wrong password without revealing account existence", async () => {
    const wrongPassword = await authenticateWithPassword(staffEmail, "WrongPass#9test");
    expect(wrongPassword.ok).toBe(false);
    if (!wrongPassword.ok) {
      expect(wrongPassword.reason).toBe("invalid_credentials");
    }

    const unknownEmail = await authenticateWithPassword(
      `missing-${runId}@test.local`,
      "WrongPass#9test",
    );
    expect(unknownEmail.ok).toBe(false);
    if (!unknownEmail.ok) {
      expect(unknownEmail.reason).toBe("invalid_credentials");
    }
  });

  it("runs forgot-password flow and allows login with new password", async () => {
    capturedResetToken = null;

    const request = await requestPasswordResetAction(staffEmail);
    expect(request.ok).toBe(true);
    expect(capturedResetToken).toBeTruthy();

    const reset = await setPasswordAction(
      capturedResetToken!,
      newPassword,
      newPassword,
      false,
    );
    expect(reset.ok).toBe(true);

    await deleteAllSessionsForUser(staffAppUserId);

    const oldLogin = await authenticateWithPassword(staffEmail, "StartPass#9test");
    expect(oldLogin.ok).toBe(false);

    const newLogin = await authenticateWithPassword(staffEmail, newPassword);
    expect(newLogin.ok).toBe(true);
  });

  it("runs invite flow: email token → set password → login", async () => {
    capturedInviteToken = null;

    const invited = await inviteUser({
      email: inviteEmail,
      name: "Invited Staff",
      role: "STAFF",
      storeId,
      employeeId: `INV${runId}`,
    });

    expect(invited.emailSent).toBe(true);
    expect(capturedInviteToken).toBeTruthy();

    const activate = await setPasswordAction(
      capturedInviteToken!,
      newPassword,
      newPassword,
      true,
    );
    expect(activate.ok).toBe(true);

    const login = await authenticateWithPassword(inviteEmail, newPassword);
    expect(login.ok).toBe(true);
    if (login.ok) {
      expect(login.profile.isActive).toBe(true);
    }
  });

});

describe.skipIf(!hasDb)("password reset missing email guard", () => {
  it("EC-BE-060: returns generic success for password reset on missing email", async () => {
    capturedResetToken = null;

    const result = await requestPasswordResetAction(
      `missing-${randomUUID().slice(0, 8)}@test.local`,
    );
    expect(result.ok).toBe(true);
    expect(capturedResetToken).toBeNull();
  });
});

describe.skipIf(!hasDb || !isSmtpConfigured())("live SMTP (optional)", () => {
  it("verifies SMTP connection when configured in .env.local", async () => {
    await expect(verifySmtpConnection()).resolves.toBeUndefined();
  }, 30_000);
});
