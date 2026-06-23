import { prisma } from "@/lib/db/prisma";
import {
  normalizeAdminPermissions,
  sanitizeAdminPermissionsInput,
} from "@/lib/auth/admin-permissions";
import { InviteError, inviteUser } from "@/lib/auth/invite-user";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { grantAnalyticsCredits } from "@/lib/services/analytics-credits";
import type {
  PlatformAdminInviteInput,
  PlatformAdminInviteResult,
  PlatformAdminRow,
  PlatformAdminUpdateInput,
} from "@/lib/validations/platform-admin.schema";
import type { AdminPermissions } from "@/types";

function mapPlatformAdminRow(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  adminPermissions: unknown;
  lastLoginAt: Date | null;
  createdAt: Date;
}): PlatformAdminRow {
  const role =
    user.role === "MASTER_ADMIN" ? "MASTER_ADMIN" : "PLATFORM_ADMIN";
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role,
    isActive: user.isActive,
    permissions: normalizeAdminPermissions(role, user.adminPermissions),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function listPlatformAdmins(): Promise<PlatformAdminRow[]> {
  const rows = await prisma.appUser.findMany({
    where: {
      role: { in: ["MASTER_ADMIN", "PLATFORM_ADMIN"] },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      adminPermissions: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return rows.map(mapPlatformAdminRow);
}

export async function invitePlatformAdmin(
  input: PlatformAdminInviteInput,
): Promise<PlatformAdminInviteResult> {
  const permissions = sanitizeAdminPermissionsInput(input.permissions);

  const result = await inviteUser({
    name: input.name,
    email: input.email,
    role: input.role,
    phone: input.phone,
    password: input.password,
    permissions: input.role === "PLATFORM_ADMIN" ? permissions : undefined,
  });

  const settings = await getPlatformSettings();
  const welcomeCredits = settings.analytics.welcomeCreditsForNewAdmins;
  if (welcomeCredits > 0) {
    await grantAnalyticsCredits({
      appUserId: result.appUserId,
      credits: welcomeCredits,
      description: "Welcome credits for new admin account",
    });
  }

  const created = await prisma.appUser.findUniqueOrThrow({
    where: { id: result.appUserId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      adminPermissions: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return {
    member: mapPlatformAdminRow(created),
    emailSent: result.emailSent,
  };
}

export async function updatePlatformAdmin(
  userId: string,
  input: PlatformAdminUpdateInput,
  actorUserId: string,
): Promise<PlatformAdminRow> {
  const existing = await prisma.appUser.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!existing || existing.role !== "PLATFORM_ADMIN") {
    throw new InviteError("Platform admin user not found", 404);
  }

  if (userId === actorUserId && input.isActive === false) {
    throw new InviteError("You cannot deactivate your own account", 400);
  }

  const permissions: AdminPermissions | undefined =
    input.permissions !== undefined
      ? sanitizeAdminPermissionsInput(input.permissions)
      : undefined;

  if (permissions && Object.keys(permissions).length === 0) {
    throw new InviteError("Select at least one portal permission", 400);
  }

  const updated = await prisma.appUser.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(permissions !== undefined ? { adminPermissions: permissions } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      adminPermissions: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return mapPlatformAdminRow(updated);
}
