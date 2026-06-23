"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStoreDetail } from "@/hooks/useStores";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import { adminStoreDetailPath } from "@/lib/utils/admin-dashboard-url";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

export type AdminStoreSection =
  | "overview"
  | "visits"
  | "calls"
  | "field-sales"
  | "staff";

interface AdminStoreBreadcrumbsProps {
  admin: AdminContent;
  storeId: string;
  section: AdminStoreSection;
}

const SECTION_LABEL_KEY: Record<
  AdminStoreSection,
  keyof AdminContent["storeDetail"]
> = {
  overview: "viewOverview",
  visits: "viewVisits",
  calls: "viewCalls",
  "field-sales": "viewFieldSales",
  staff: "viewStaff",
};

export function AdminStoreBreadcrumbs({
  admin,
  storeId,
  section,
}: AdminStoreBreadcrumbsProps) {
  const { data: store } = useStoreDetail(storeId);
  const storeName = store?.name ?? admin.storeDetail.titleFallback;
  const sectionLabel = admin.storeDetail[SECTION_LABEL_KEY[section]];

  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-text-muted">
        <li>
          <Link href={ADMIN_DASHBOARD_PATH} className="hover:text-brand-gold">
            {admin.nav.overview}
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <li>
          <Link href="/admin/dashboard/accounts" className="hover:text-brand-gold">
            {admin.nav.accounts}
          </Link>
        </li>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <li>
          <Link
            href={adminStoreDetailPath(storeId)}
            className="hover:text-brand-gold"
          >
            {storeName}
          </Link>
        </li>
        {section !== "overview" ? (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <li className="font-medium text-text-primary" aria-current="page">
              {sectionLabel}
            </li>
          </>
        ) : (
          <li className="sr-only" aria-current="page">
            {sectionLabel}
          </li>
        )}
      </ol>
    </nav>
  );
}
