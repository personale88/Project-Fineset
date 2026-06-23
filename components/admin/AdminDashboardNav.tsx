"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CreditCard, LayoutGrid, Settings2, Store, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasAdminPermission } from "@/lib/auth/admin-permissions";
import { useAdminPortalOptional } from "@/components/admin/AdminPortalContext";
import type { Content } from "@/content/en";
import type { AdminPermissionKey } from "@/types";

type AdminNavLabels = Content["admin"]["nav"];

const NAV_ITEMS: ReadonlyArray<{
  href: string;
  labelKey: keyof AdminNavLabels;
  icon: typeof LayoutGrid;
  permission: AdminPermissionKey;
}> = [
  { href: "/admin/dashboard", labelKey: "overview", icon: LayoutGrid, permission: "portfolio" },
  { href: "/admin/dashboard/analytics", labelKey: "analytics", icon: BarChart3, permission: "analytics" },
  { href: "/admin/dashboard/accounts", labelKey: "accounts", icon: Store, permission: "accounts" },
  { href: "/admin/dashboard/billing", labelKey: "billing", icon: CreditCard, permission: "billing" },
  { href: "/admin/dashboard/automation", labelKey: "automation", icon: Zap, permission: "billing" },
  { href: "/admin/dashboard/settings", labelKey: "settings", icon: Settings2, permission: "portfolio" },
] as const;

function isAdminNavActive(pathname: string, href: string): boolean {
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

interface AdminDashboardNavProps {
  labels: AdminNavLabels;
  className?: string;
}

export function AdminDashboardNav({ labels, className }: AdminDashboardNavProps) {
  const pathname = usePathname();
  const portal = useAdminPortalOptional();

  const visibleItems = NAV_ITEMS.filter(({ permission, href }) => {
    if (href === "/admin/dashboard/settings" && portal?.role !== "MASTER_ADMIN") {
      return false;
    }
    if (!portal) return true;
    return hasAdminPermission(portal.role, portal.permissions, permission);
  });

  return (
    <nav
      aria-label="Admin dashboard"
      className={cn(
        "border-b border-border bg-surface-card/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none",
        className,
      )}
    >
      <div
        className={cn(
          "-mb-px flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "snap-x snap-mandatory gap-1.5 px-4 py-2 lg:snap-none lg:gap-2 lg:px-0 lg:py-0",
        )}
        role="tablist"
      >
        {visibleItems.map(({ href, labelKey, icon: Icon }) => {
          const active = isAdminNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center transition-colors",
                "snap-start gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium lg:gap-2 lg:rounded-none lg:border-b-2 lg:px-4 lg:py-2.5 lg:text-sm",
                active
                  ? "bg-brand-gold text-white shadow-sm lg:bg-transparent lg:text-brand-gold lg:shadow-none"
                  : "bg-surface-secondary/70 text-text-secondary hover:bg-surface-secondary lg:border-transparent lg:bg-transparent lg:text-text-muted lg:hover:border-border lg:hover:text-text-primary",
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 shrink-0 lg:size-4",
                  active
                    ? "text-white lg:text-brand-gold"
                    : "text-text-muted",
                )}
                aria-hidden
              />
              {labels[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
