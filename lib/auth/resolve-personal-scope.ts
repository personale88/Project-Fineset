import type { AppSession } from "@/types";
import { requirePortalActorContext } from "@/lib/auth/resolve-staff";

export async function resolvePersonalStaffId(
  session: AppSession,
  personalScope?: boolean,
): Promise<string | undefined> {
  if (!personalScope || session.role !== "STORE_MANAGER") {
    return undefined;
  }

  const actor = await requirePortalActorContext(session);
  return actor?.staffId;
}

/** When true, personal-scope list APIs should return empty results (not store-wide data). */
export function isUnlinkedManagerPersonalScope(
  session: AppSession,
  personalScope: boolean | undefined,
  personalStaffId: string | undefined,
): boolean {
  return Boolean(
    personalScope && session.role === "STORE_MANAGER" && !personalStaffId,
  );
}

export function resolveStaffCallsStoreScope(
  role: string,
  personalScope?: boolean,
): boolean {
  if (personalScope) return false;
  return role === "BUSINESS_OWNER" || role === "STORE_MANAGER" || role === "MASTER_ADMIN";
}
