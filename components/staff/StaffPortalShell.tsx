"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { content } from "@/content/en";
import { BillingAccessProvider } from "@/components/billing/BillingAccessProvider";
import { BillingAccessBanner } from "@/components/billing/BillingAccessBanner";
import { PortalShell } from "@/components/layout/PortalShell";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import { buildStaffDesktopNav } from "@/components/store/staff-desktop-nav";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { StaffNotificationBell } from "@/components/staff/StaffNotificationBell";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { shouldHidePortalBottomNav } from "@/lib/utils/portal-bottom-nav";

interface StaffPortalShellProps {
  storeId?: string;
  children: ReactNode;
}

export function StaffPortalShell({ storeId, children }: StaffPortalShellProps) {
  const pathname = usePathname();
  const hideBottomNav = shouldHidePortalBottomNav(pathname);

  return (
    <BillingAccessProvider storeId={storeId}>
      <PortalShell
        title={content.staff.shell.title}
        homeHref={STAFF_DASHBOARD_PATH}
        navItems={buildStaffDesktopNav()}
        showDesktopNav
        signOutLabel={content.common.signOut}
        headerActions={
          <>
            <GlobalSearchDialog storeId={storeId} />
            <StaffNotificationBell />
          </>
        }
        bottomNav={hideBottomNav ? undefined : <StaffBottomNav />}
      >
        <div className="space-y-4">
          <BillingAccessBanner />
          {children}
        </div>
      </PortalShell>
    </BillingAccessProvider>
  );
}
