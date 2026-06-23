import { randomUUID } from "crypto";
import { mergeStoreWhere } from "@/lib/db/store-scope";
import { prisma } from "@/lib/db/prisma";
import { createInviteToken } from "@/lib/auth/action-tokens";
import { hashCredential } from "@/lib/auth/credentials";
import { logAuthEvent } from "@/lib/auth/audit";
import { validatePassword } from "@/lib/auth/password-policy";
import { sendInviteEmail } from "@/lib/email/templates/auth-emails";
import { isSmtpConfigured } from "@/lib/email/env";
import { SmtpNotConfiguredError } from "@/lib/email/errors";
import { sanitizeAdminPermissionsInput } from "@/lib/auth/admin-permissions";
import type { InviteUserInput } from "@/lib/validations/user-invite.schema";
import type { AppRole } from "@prisma/client";

export interface InviteUserResult {
  appUserId: string;
  email: string;
  role: AppRole;
  emailSent: boolean;
}

export async function inviteUser(
  input: InviteUserInput,
): Promise<InviteUserResult> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const startedAt = Date.now();

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    throw new InviteError("This email is already registered", 409);
  }

  if (input.storeId) {
    const store = await prisma.store.findFirst({
      where: mergeStoreWhere({ id: input.storeId, isActive: true }),
    });
    if (!store) {
      throw new InviteError("Store not found or inactive", 404);
    }
  }

  let staffId: string | undefined;

  const createsStaffRecord =
    input.role === "STAFF" ||
    (input.role === "STORE_MANAGER" && Boolean(input.employeeId));

  if (createsStaffRecord) {
    if (!input.employeeId || !input.storeId) {
      throw new InviteError("Staff invite requires employeeId and storeId", 400);
    }

    const duplicateEmployee = await prisma.staff.findUnique({
      where: { employeeId: input.employeeId },
    });
    if (duplicateEmployee) {
      throw new InviteError("Employee ID already exists", 409);
    }

    const staffRole = input.role === "STORE_MANAGER" ? "STORE_MANAGER" : "STAFF";

    const staff = await prisma.staff.create({
      data: {
        name,
        employeeId: input.employeeId,
        phone: input.phone,
        storeId: input.storeId,
        role: staffRole,
        isActive: true,
      },
    });
    staffId = staff.id;
  }

  const now = new Date();
  let passwordHash: string | undefined;
  let provisionedWithPassword = false;

  if (input.password) {
    const passwordCheck = validatePassword(input.password);
    if (!passwordCheck.success) {
      if (staffId) {
        await prisma.staff.delete({ where: { id: staffId } }).catch(() => undefined);
      }
      throw new InviteError(passwordCheck.error ?? "Invalid password", 400);
    }
    passwordHash = await hashCredential(input.password);
    provisionedWithPassword = true;
  }

  const appUser = await prisma.appUser.create({
    data: {
      authId: randomUUID(),
      email,
      name,
      role: input.role,
      storeId: input.storeId,
      staffId,
      phone: input.phone?.trim() || undefined,
      adminPermissions:
        input.role === "PLATFORM_ADMIN"
          ? sanitizeAdminPermissionsInput(input.permissions)
          : undefined,
      passwordHash,
      isActive: provisionedWithPassword,
      invitedAt: now,
      activatedAt: provisionedWithPassword ? now : undefined,
    },
  });

  let emailSent = false;

  if (!provisionedWithPassword) {
    if (!isSmtpConfigured()) {
      await prisma.appUser.delete({ where: { id: appUser.id } }).catch(() => undefined);
      if (staffId) {
        await prisma.staff.delete({ where: { id: staffId } }).catch(() => undefined);
      }
      throw new InviteError(
        "SMTP is not configured — set SMTP_* environment variables to send invite emails",
        502,
      );
    }

    try {
      const token = await createInviteToken(appUser.id);
      await sendInviteEmail(email, name, token);
      emailSent = true;
    } catch (error) {
      await prisma.appUser.delete({ where: { id: appUser.id } }).catch(() => undefined);
      if (staffId) {
        await prisma.staff.delete({ where: { id: staffId } }).catch(() => undefined);
      }
      if (error instanceof SmtpNotConfiguredError) {
        throw new InviteError(error.message, 502);
      }
      console.error("[invite-user] email failed", { email, error });
      throw new InviteError("Failed to send invitation email", 502);
    }
  }

  await logAuthEvent({
    event: provisionedWithPassword ? "USER_CREATED_WITH_PASSWORD" : "INVITE_SENT",
    email,
    metadata: { role: input.role, storeId: input.storeId, appUserId: appUser.id },
  });

  console.info("[invite-user] success", {
    email,
    role: input.role,
    emailSent,
    elapsedMs: Date.now() - startedAt,
  });

  return {
    appUserId: appUser.id,
    email,
    role: input.role,
    emailSent,
  };
}

export class InviteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "InviteError";
  }
}
