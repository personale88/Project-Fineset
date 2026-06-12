import { badRequest, forbidden, notFound } from "@/lib/auth/session";
import { assertStoreExists } from "@/lib/services/analytics";
import {
  isStorePortalSession,
  resolveAccessibleStoreId,
} from "@/lib/services/manager-stores";
import type { AppSession, StorePortalSession } from "@/types";
import { NextResponse } from "next/server";

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
