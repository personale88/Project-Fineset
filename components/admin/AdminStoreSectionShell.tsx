"use client";

import type { ReactNode } from "react";
import { AdminStoreBreadcrumbs, type AdminStoreSection } from "@/components/admin/AdminStoreBreadcrumbs";
import type { Content } from "@/content/en";

interface AdminStoreSectionShellProps {
  admin: Content["admin"];
  storeId: string;
  section: AdminStoreSection;
  children: ReactNode;
}

export function AdminStoreSectionShell({
  admin,
  storeId,
  section,
  children,
}: AdminStoreSectionShellProps) {
  return (
    <div className="space-y-2">
      <AdminStoreBreadcrumbs admin={admin} storeId={storeId} section={section} />
      {children}
    </div>
  );
}
