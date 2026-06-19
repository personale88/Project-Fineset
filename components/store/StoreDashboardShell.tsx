"use client";

import type { ReactNode } from "react";
import { content } from "@/content/en";
import { PortalShell } from "@/components/layout/PortalShell";
import { StoreGlobalSearch } from "@/components/search/GlobalSearchDialog";
import { ManagerBottomNav } from "@/components/store/ManagerBottomNav";
import { ManagerNotificationBell } from "@/components/store/ManagerNotificationBell";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

interface StoreDashboardShellProps {
  title: string;
  signOutLabel: string;
  children: ReactNode;
}

export function StoreDashboardShell({
  title,
  signOutLabel,
  children,
}: StoreDashboardShellProps) {
  return (
    <PortalShell
      title={title}
      homeHref={STORE_MANAGER_DASHBOARD_PATH}
      showDesktopNav={false}
      signOutLabel={signOutLabel}
      headerActions={
        <>
          <StoreGlobalSearch />
          <ManagerNotificationBell />
        </>
      }
      bottomNav={<ManagerBottomNav />}
    >
      {children}
    </PortalShell>
  );
}
