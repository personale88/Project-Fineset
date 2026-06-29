import type { AdminPortalRole } from "@/types";

/** Master admins can mutate platform-wide admin settings; platform admins are view-only. */
export function canEditAdminPortal(role: AdminPortalRole): boolean {
  return role === "MASTER_ADMIN";
}

/** Master admins can mutate automation settings; platform admins are view-only. */
export function canManageAutomationSettings(role: AdminPortalRole): boolean {
  return canEditAdminPortal(role);
}
