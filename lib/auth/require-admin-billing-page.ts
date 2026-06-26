import { redirect } from "next/navigation";
import {
  requireAdminPermission,
} from "@/lib/auth/require-admin-permission";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import type { AdminSession } from "@/types";

/** Server page guard: billing permission required (EC-AUTO-004). */
export async function requireAdminBillingPageAccess(): Promise<AdminSession> {
  const session = await requirePortalSession(["MASTER_ADMIN", "PLATFORM_ADMIN"]);
  if (!requireAdminPermission(session, "billing")) {
    redirect("/admin/dashboard");
  }
  return session;
}
