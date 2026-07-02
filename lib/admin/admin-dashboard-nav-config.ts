import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  LayoutGrid,
  Settings2,
  Store,
  Zap,
} from "lucide-react";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import type { Content } from "@/content/en";
import type { AdminPermissionKey, AdminPortalRole } from "@/types";

type AdminNavLabels = Content["admin"]["nav"];

export interface AdminDashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: AdminPermissionKey;
  /** Shorter label for the mobile bottom bar. */
  shortLabel: string;
}

const ADMIN_DASHBOARD_NAV_DEFINITIONS = [
  {
    href: "/admin/dashboard",
    labelKey: "overview" as const,
    icon: LayoutGrid,
    permission: "portfolio" as const,
    shortLabel: "Portfolio",
  },
  {
    href: "/admin/dashboard/analytics",
    labelKey: "analytics" as const,
    icon: BarChart3,
    permission: "analytics" as const,
    shortLabel: "Analytics",
  },
  {
    href: "/admin/dashboard/accounts",
    labelKey: "accounts" as const,
    icon: Store,
    permission: "accounts" as const,
    shortLabel: "Accounts",
  },
  {
    href: "/admin/dashboard/billing",
    labelKey: "billing" as const,
    icon: CreditCard,
    permission: "billing" as const,
    shortLabel: "Billing",
  },
  {
    href: "/admin/dashboard/automation",
    labelKey: "automation" as const,
    icon: Zap,
    permission: "billing" as const,
    shortLabel: "Automation",
  },
  {
    href: "/admin/dashboard/settings",
    labelKey: "settings" as const,
    icon: Settings2,
    permission: "portfolio" as const,
    shortLabel: "Settings",
  },
] as const;

export function isAdminNavActive(pathname: string, href: string): boolean {
  if (href === "/admin/dashboard") {
    return pathname === href;
  }
  if (href === "/admin/dashboard/accounts") {
    return (
      pathname.startsWith("/admin/dashboard/accounts") ||
      pathname.startsWith("/admin/dashboard/stores")
    );
  }
  return pathname.startsWith(href);
}

export function resolveAdminNavItems(
  labels: AdminNavLabels,
  role?: AdminPortalRole,
  permissions?: Partial<Record<AdminPermissionKey, boolean>>,
): AdminDashboardNavItem[] {
  return ADMIN_DASHBOARD_NAV_DEFINITIONS.filter(({ permission, href }) => {
    if (href === "/admin/dashboard/settings" && role !== "MASTER_ADMIN") {
      return false;
    }
    if (!role || !permissions) return true;
    return hasAdminPermission(role, permissions, permission);
  }).map(({ href, labelKey, icon, permission, shortLabel }) => ({
    href,
    label: labels[labelKey],
    icon,
    permission,
    shortLabel,
  }));
}

/** Primary destinations shown directly in the mobile bottom bar. */
export const ADMIN_MOBILE_BOTTOM_PRIMARY_HREFS = [
  "/admin/dashboard",
  "/admin/dashboard/accounts",
  "/admin/dashboard/analytics",
  "/admin/dashboard/automation",
] as const;

export function splitAdminNavForMobile(items: AdminDashboardNavItem[]) {
  const primary = items.filter((item) =>
    (ADMIN_MOBILE_BOTTOM_PRIMARY_HREFS as readonly string[]).includes(item.href),
  );
  const overflow = items.filter(
    (item) => !(ADMIN_MOBILE_BOTTOM_PRIMARY_HREFS as readonly string[]).includes(item.href),
  );
  return { primary, overflow };
}
