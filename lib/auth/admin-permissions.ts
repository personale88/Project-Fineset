import type { AdminPermissions, AdminPermissionKey, AdminPortalRole } from "@/types";

export const ADMIN_PERMISSION_KEYS = [
  "portfolio",
  "accounts",
  "analytics",
  "billing",
] as const satisfies readonly AdminPermissionKey[];

export const DEFAULT_PLATFORM_ADMIN_PERMISSIONS: AdminPermissions = {
  accounts: true,
  portfolio: true,
};

export function isAdminPortalRole(role: string): role is AdminPortalRole {
  return role === "MASTER_ADMIN" || role === "PLATFORM_ADMIN";
}

export function normalizeAdminPermissions(
  role: AdminPortalRole,
  raw: unknown,
): AdminPermissions {
  if (role === "MASTER_ADMIN") {
    return Object.fromEntries(
      ADMIN_PERMISSION_KEYS.map((key) => [key, true]),
    ) as AdminPermissions;
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PLATFORM_ADMIN_PERMISSIONS };
  }

  const source = raw as Record<string, unknown>;
  const permissions: AdminPermissions = {};
  for (const key of ADMIN_PERMISSION_KEYS) {
    if (source[key] === true) {
      permissions[key] = true;
    }
  }

  if (Object.keys(permissions).length === 0) {
    return { ...DEFAULT_PLATFORM_ADMIN_PERMISSIONS };
  }

  return permissions;
}

export function hasAdminPermission(
  role: AdminPortalRole,
  permissions: AdminPermissions,
  key: AdminPermissionKey,
): boolean {
  if (role === "MASTER_ADMIN") return true;
  return permissions[key] === true;
}

export function sanitizeAdminPermissionsInput(
  input: Partial<AdminPermissions> | undefined,
): AdminPermissions {
  const permissions: AdminPermissions = {};
  if (!input) return permissions;

  for (const key of ADMIN_PERMISSION_KEYS) {
    if (input[key] === true) {
      permissions[key] = true;
    }
  }

  return permissions;
}
