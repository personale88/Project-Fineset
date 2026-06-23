"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { BillingAccessBanner } from "@/components/billing/BillingAccessBanner";
import { BillingAccessProvider } from "@/components/billing/BillingAccessProvider";
import { StoreGlobalSearch } from "@/components/search/GlobalSearchDialog";
import { buildManagerDesktopNav } from "@/components/store/manager-desktop-nav";
import { ManagerBottomNav } from "@/components/store/ManagerBottomNav";
import { ManagerNotificationBell } from "@/components/store/ManagerNotificationBell";
import { OwnerNotificationBell } from "@/components/store/OwnerNotificationBell";
import { OwnerBottomNav } from "@/components/store/OwnerBottomNav";
import { portalDashboardPath } from "@/lib/utils/store-dashboard-url";
import { shouldHidePortalBottomNav } from "@/lib/utils/portal-bottom-nav";

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
  const pathname = usePathname();
  const hideBottomNav = shouldHidePortalBottomNav(pathname);
  const homeHref = portalDashboardPath(portalRole);
  const navItems =
    portalRole === "STORE_MANAGER" && storeId
      ? buildManagerDesktopNav(storeId)
      : [];

  return (
    <BillingAccessProvider storeId={storeId}>
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
          hideBottomNav
            ? undefined
            : portalRole === "STORE_MANAGER"
              ? <ManagerBottomNav />
              : <OwnerBottomNav />
        }
      >
        <div className="space-y-4">
          <BillingAccessBanner />
          {children}
        </div>
      </PortalShell>
    </BillingAccessProvider>
  );
}
