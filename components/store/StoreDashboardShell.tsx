"use client";

import type { ReactNode } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { StoreGlobalSearch } from "@/components/search/GlobalSearchDialog";

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
      signOutLabel={signOutLabel}
      headerActions={<StoreGlobalSearch />}
    >
      {children}
    </PortalShell>
  );
}
