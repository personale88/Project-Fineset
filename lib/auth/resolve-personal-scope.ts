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

export function resolveStaffCallsStoreScope(
  role: string,
  personalScope?: boolean,
): boolean {
  if (personalScope) return false;
  return role === "BUSINESS_OWNER" || role === "STORE_MANAGER" || role === "MASTER_ADMIN";
}
