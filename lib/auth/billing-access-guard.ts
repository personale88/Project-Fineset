import { NextResponse } from "next/server";
import type { AppSession } from "@/types";
import { BILLING_RESTRICTED_CODE } from "@/lib/billing/constants";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { getPortalBillingAccessForRole } from "@/lib/services/portal-billing-access";
import { formatDate } from "@/lib/utils/formatters";

export { BILLING_RESTRICTED_CODE };

/** Soft-empty list response — never surfaces as a client error. */
export function billingRestrictedEmptyList<T extends Record<string, unknown>>(
  extra: T,
): NextResponse {
  return NextResponse.json({
    ...extra,
    billingRestricted: true,
  });
}

export async function resolveStoreIdForBillingCheck(
  session: AppSession,
  storeId?: string | null,
): Promise<string | null> {
  if (session.role === "STAFF" || session.role === "STORE_MANAGER") {
    return session.storeId;
  }
  if (session.role === "BUSINESS_OWNER") {
    return storeId?.trim() || session.storeId;
  }
  return storeId?.trim() || null;
}

async function resolveEffectiveStoreId(
  session: AppSession,
  storeId?: string | null,
): Promise<string | null> {
  let effectiveStoreId = await resolveStoreIdForBillingCheck(session, storeId);

  if (session.role === "STAFF" && !effectiveStoreId) {
    const staff = await requireStaffContext(session);
    effectiveStoreId = staff?.storeId ?? null;
  }

  return effectiveStoreId;
}

/** Returns true when portal read access is blocked for the session role. */
export async function isPortalDataReadBlockedForSession(
  session: AppSession,
  storeId?: string | null,
): Promise<boolean> {
  if (session.role === "MASTER_ADMIN") return false;

  const effectiveStoreId = await resolveEffectiveStoreId(session, storeId);
  if (!effectiveStoreId) return false;

  const access = await getPortalBillingAccessForRole(effectiveStoreId, session.role);
  return Boolean(access?.billingRestricted);
}

/** @deprecated Use isPortalDataReadBlockedForSession */
export async function isPortalDataReadBlocked(
  session: AppSession,
  storeId: string,
): Promise<boolean> {
  return isPortalDataReadBlockedForSession(session, storeId);
}

/** Block mutating operations when billing access is restricted (same rules as read). */
export async function isPortalDataWriteBlockedForSession(
  session: AppSession,
  storeId?: string | null,
): Promise<boolean> {
  return isPortalDataReadBlockedForSession(session, storeId);
}

export function billingRestrictedMutationResponse(): NextResponse {
  return NextResponse.json(
    {
      message: "Portal access is restricted until billing is resolved for this account.",
      code: BILLING_RESTRICTED_CODE,
      billingRestricted: true,
    },
    { status: 402 },
  );
}

export function formatBillingDeadlineFallback(reference = new Date()): string {
  return formatDate(reference);
}
