"use client";

import {
  adminRouteHasChildPanel,
  adminRouteUsesScopedPageScroll,
} from "@/lib/admin/admin-dashboard-layout";
import {
  portalAdminAnalyticsContentClassName,
  portalAdminContentShellClassName,
  portalAdminContentVerticalPaddingClassName,
  portalAdminContentWithChildPanelClassName,
  portalAdminMainScrollClassName,
  portalAdminScopedPageContentClassName,
} from "@/components/layout/portal-side-nav-styles";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface AdminDashboardContentProps {
  children: React.ReactNode;
  className?: string;
}

const ANALYTICS_ROUTE_PREFIX = "/admin/dashboard/analytics";

/** Full-width admin page content with consistent spacing from left navigation panels. */
export function AdminDashboardContent({ children, className }: AdminDashboardContentProps) {
  const pathname = usePathname();
  const hasChildPanel = adminRouteHasChildPanel(pathname);
  const isAnalytics = pathname.startsWith(ANALYTICS_ROUTE_PREFIX);
  const isScopedPage = adminRouteUsesScopedPageScroll(pathname);

  return (
    <div
      className={cn(
        portalAdminContentShellClassName,
        hasChildPanel && portalAdminContentWithChildPanelClassName,
        isAnalytics
          ? portalAdminAnalyticsContentClassName
          : isScopedPage
            ? portalAdminScopedPageContentClassName
            : cn(portalAdminContentVerticalPaddingClassName, portalAdminMainScrollClassName),
        className,
      )}
      data-testid="admin-dashboard-content"
      data-admin-child-panel={hasChildPanel ? "" : undefined}
    >
      {children}
    </div>
  );
}
