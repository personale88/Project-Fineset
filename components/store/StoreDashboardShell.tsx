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
import { PortalProfileButton } from "@/components/store/PortalProfileButton";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { OwnerBottomNav } from "@/components/store/OwnerBottomNav";
import { portalDashboardPath } from "@/lib/utils/store-dashboard-url";
import { shouldHidePortalBottomNav } from "@/lib/utils/portal-bottom-nav";

interface StoreDashboardShellProps {
  title: string;
  signOutLabel: string;
  portalRole?: "STORE_MANAGER" | "BUSINESS_OWNER";
  children: ReactNode;
}

export function StoreDashboardShell({
  title,
  signOutLabel,
  portalRole = "STORE_MANAGER",
  children,
}: StoreDashboardShellProps) {
  const pathname = usePathname();
  const { storeId } = useStoreDashboard();
  const hideBottomNav = shouldHidePortalBottomNav(pathname);
  const homeHref = portalDashboardPath(portalRole);
  const navItems =
    portalRole === "STORE_MANAGER" && storeId
      ? buildManagerDesktopNav(storeId)
      : [];

  return (
    <BillingAccessProvider storeId={storeId ?? undefined}>
      <PortalShell
        title={title}
        homeHref={homeHref}
        navItems={navItems}
        showDesktopNav={portalRole === "STORE_MANAGER"}
        signOutLabel={signOutLabel}
        showSignOut={false}
        headerActions={
          <>
            <StoreGlobalSearch />
            {portalRole === "STORE_MANAGER" ? (
              <>
                <ManagerNotificationBell />
                <PortalProfileButton portalRole="STORE_MANAGER" />
              </>
            ) : null}
            {portalRole === "BUSINESS_OWNER" ? (
              <>
                <OwnerNotificationBell />
                <PortalProfileButton portalRole="BUSINESS_OWNER" />
              </>
            ) : null}
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
