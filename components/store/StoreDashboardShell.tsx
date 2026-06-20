"use client";

import type { ReactNode } from "react";
import { content } from "@/content/en";
import { PortalShell } from "@/components/layout/PortalShell";
import { StoreGlobalSearch } from "@/components/search/GlobalSearchDialog";
import { buildManagerDesktopNav } from "@/components/store/manager-desktop-nav";
import { buildOwnerDesktopNav } from "@/components/store/owner-desktop-nav";
import { ManagerBottomNav } from "@/components/store/ManagerBottomNav";
import { ManagerNotificationBell } from "@/components/store/ManagerNotificationBell";
import { OwnerNotificationBell } from "@/components/store/OwnerNotificationBell";
import { OwnerBottomNav } from "@/components/store/OwnerBottomNav";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
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
  const { storeId: contextStoreId } = useStoreDashboard();
  const managerNavItems =
    portalRole === "STORE_MANAGER" && storeId
      ? buildManagerDesktopNav(storeId)
      : [];
  const ownerNavItems =
    portalRole === "BUSINESS_OWNER"
      ? buildOwnerDesktopNav(contextStoreId)
      : [];

  return (
    <PortalShell
      title={title}
      homeHref={homeHref}
      navItems={portalRole === "STORE_MANAGER" ? managerNavItems : ownerNavItems}
      showDesktopNav
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
