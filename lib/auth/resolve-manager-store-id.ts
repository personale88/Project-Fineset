import { requireStaffContext } from "@/lib/auth/resolve-staff";
import {
  badRequest,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/auth/session";
import { assertStoreExists } from "@/lib/services/analytics";
import {
  isStorePortalSession,
  resolveAccessibleStoreId,
} from "@/lib/services/manager-stores";
import type { AppSession, StorePortalSession } from "@/types";
import { NextResponse } from "next/server";

/**
 * Resolves the effective store id for portal/API routes from session + optional request storeId.
 * Handles STAFF, STORE_MANAGER, BUSINESS_OWNER, and MASTER_ADMIN (admin requires storeId).
 */
export async function resolvePortalStoreIdForSession(
  session: AppSession,
  requestedStoreId?: string | null,
): Promise<string | NextResponse> {
  const normalized =
    typeof requestedStoreId === "string" && requestedStoreId.trim()
      ? requestedStoreId.trim()
      : undefined;

  if (session.role === "MASTER_ADMIN") {
    if (!normalized) {
      return badRequest({ storeId: ["storeId is required"] });
    }
    const exists = await assertStoreExists(normalized);
    if (!exists) {
      return notFound("Store not found");
    }
    return normalized;
  }

  if (session.role === "STAFF") {
    const staff = await requireStaffContext(session);
    if (!staff) {
      return unauthorized();
    }
    if (normalized && normalized !== staff.storeId) {
      return forbidden();
    }
    return staff.storeId;
  }

  if (isStorePortalSession(session)) {
    return resolveStorePortalStoreId(session, normalized);
  }

  return forbidden();
}

export async function resolveStorePortalStoreId(
  session: AppSession,
  requestedStoreId?: string,
): Promise<string | NextResponse> {
  if (!isStorePortalSession(session)) {
    return forbidden();
  }

  try {
    return await resolveAccessibleStoreId(session, requestedStoreId);
  } catch {
    return forbidden();
  }
}

export async function resolveAnalyticsStoreId(
  session: AppSession,
  requestedStoreId?: string,
): Promise<string | NextResponse> {
  if (session.role === "MASTER_ADMIN") {
    if (!requestedStoreId) {
      return badRequest({ storeId: ["storeId is required"] });
    }

    const exists = await assertStoreExists(requestedStoreId);
    if (!exists) {
      return notFound("Store not found");
    }

    return requestedStoreId;
  }

  return resolveStorePortalStoreId(session, requestedStoreId);
}

/** @deprecated Use resolveStorePortalStoreId */
export async function resolveStoreManagerAnalyticsStoreId(
  session: StorePortalSession,
  requestedStoreId?: string,
): Promise<string | NextResponse> {
  return resolveStorePortalStoreId(session, requestedStoreId);
}
