import { NextResponse } from "next/server";
import {
  hasAdminPermission,
  isAdminPortalRole,
} from "@/lib/auth/admin-permissions";
import { forbidden } from "@/lib/auth/session";
import type { AdminPermissionKey, AdminSession, AppSession } from "@/types";

export function isAdminPortalSession(
  session: AppSession | null,
): session is AdminSession {
  return session !== null && isAdminPortalRole(session.role);
}

export function requireAdminPermission(
  session: AppSession | null,
  permission: AdminPermissionKey,
): session is AdminSession {
  if (!isAdminPortalSession(session)) return false;
  return hasAdminPermission(session.role, session.permissions, permission);
}

export function adminPermissionForbidden(
  message = "You do not have access to this admin feature.",
): NextResponse {
  return forbidden(message);
}
