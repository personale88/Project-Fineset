import { redirect } from "next/navigation";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import type { AdminSession } from "@/types";

export function shouldRedirectPlatformAdminWithoutBilling(
  session: AdminSession,
): boolean {
  return (
    session.role === "PLATFORM_ADMIN" &&
    !hasAdminPermission(session.role, session.permissions, "billing")
  );
}

export async function requireAdminBillingPageSession(): Promise<AdminSession> {
  const session = await requirePortalSession(["MASTER_ADMIN", "PLATFORM_ADMIN"]);

  if (shouldRedirectPlatformAdminWithoutBilling(session)) {
    redirect(ADMIN_DASHBOARD_PATH);
  }

  return session;
}
