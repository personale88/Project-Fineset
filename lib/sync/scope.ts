import { normalizeManagerEmail } from "@/lib/services/manager-stores";
import type { AppSession } from "@/types";

export function resolveSyncScope(session: AppSession): string {
  if (session.role === "MASTER_ADMIN") return "all";
  if (session.role === "BUSINESS_OWNER") {
    return `owner:${normalizeManagerEmail(session.email)}`;
  }
  return session.storeId;
}
