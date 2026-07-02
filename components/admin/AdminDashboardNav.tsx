"use client";

import Link from "next/link";
import { PortalSideNav } from "@/components/layout/PortalSideNav";
import { Logo } from "@/components/shared/Logo";
import { useAdminPortalOptional } from "@/components/admin/AdminPortalContext";
import {
  isAdminNavActive,
  resolveAdminNavItems,
} from "@/lib/admin/admin-dashboard-nav-config";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import type { Content } from "@/content/en";

type AdminNavLabels = Content["admin"]["nav"];

interface AdminDashboardNavProps {
  labels: AdminNavLabels;
  homeHref?: string;
}

export function AdminDashboardNav({
  labels,
  homeHref = ADMIN_DASHBOARD_PATH,
}: AdminDashboardNavProps) {
  const portal = useAdminPortalOptional();
  const items = resolveAdminNavItems(labels, portal?.role, portal?.permissions);

  return (
    <PortalSideNav
      items={items}
      ariaLabel="Admin dashboard"
      isActive={isAdminNavActive}
      fixed
      brand={
        <Link href={homeHref} aria-label="Admin dashboard home" className="inline-flex">
          <Logo size={36} linked={false} />
        </Link>
      }
    />
  );
}
