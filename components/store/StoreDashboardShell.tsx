"use client";

import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { StoreGlobalSearch } from "@/components/search/GlobalSearchDialog";
import { buildManagerDesktopNav } from "@/components/store/manager-desktop-nav";
import { ManagerBottomNav } from "@/components/store/ManagerBottomNav";
import { ManagerNotificationBell } from "@/components/store/ManagerNotificationBell";
import { OwnerNotificationBell } from "@/components/store/OwnerNotificationBell";
import { OwnerBottomNav } from "@/components/store/OwnerBottomNav";
import { portalDashboardPath } from "@/lib/utils/store-dashboard-url";

interface StoreDashboardShellProps {
  title: string;
  signOutLabel: string;
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  storeId?: string;
  children: ReactNode;
}

export function StoreDashboardShell({
  title,
  signOutLabel,
  portalRole = "STORE_MANAGER",
  storeId,
  children,
}: StoreDashboardShellProps) {
  const homeHref = portalDashboardPath(portalRole);
  const navItems =
    portalRole === "STORE_MANAGER" && storeId
      ? buildManagerDesktopNav(storeId)
      : [];

  return (
    <PortalShell
      title={title}
      homeHref={homeHref}
      navItems={navItems}
      showDesktopNav={portalRole === "STORE_MANAGER"}
      signOutLabel={signOutLabel}
      headerActions={
        <>
          <StoreGlobalSearch />
          {portalRole === "STORE_MANAGER" ? <ManagerNotificationBell /> : null}
          {portalRole === "BUSINESS_OWNER" ? <OwnerNotificationBell /> : null}
        </>
      }
      bottomNav={
        portalRole === "STORE_MANAGER" ? <ManagerBottomNav /> : <OwnerBottomNav />
      }
    >
      {children}
    </PortalShell>
  );
}
