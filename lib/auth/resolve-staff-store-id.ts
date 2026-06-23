import { NextResponse } from "next/server";
import { isAdminPortalRole } from "@/lib/auth/admin-permissions";
import {
  adminPermissionForbidden,
  requireAdminPermission,
} from "@/lib/auth/require-admin-permission";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import type { AppSession } from "@/types";

export async function resolveStaffWriteStoreId(
  session: AppSession,
  requestedStoreId?: string | null,
): Promise<string | NextResponse> {
  if (isAdminPortalRole(session.role)) {
    if (!requireAdminPermission(session, "accounts")) {
      return adminPermissionForbidden();
    }
    return resolvePortalStoreIdForSession(session, requestedStoreId);
  }

  return resolveStorePortalStoreId(session, requestedStoreId ?? undefined);
}
