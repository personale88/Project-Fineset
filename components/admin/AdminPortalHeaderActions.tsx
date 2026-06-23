"use client";

import { AdminGlobalSearchDialog } from "@/components/admin/AdminGlobalSearchDialog";
import type { Content } from "@/content/en";

interface AdminPortalHeaderActionsProps {
  search: Content["admin"]["search"];
  store: Content["store"];
  visitFields: Content["visitForm"]["fields"];
  productLabels: Record<string, string>;
}

export function AdminPortalHeaderActions({
  search,
  store,
  visitFields,
  productLabels,
}: AdminPortalHeaderActionsProps) {
  return (
    <AdminGlobalSearchDialog
      copy={search}
      storeCopy={store}
      visitFields={visitFields}
      productLabels={productLabels}
    />
  );
}
