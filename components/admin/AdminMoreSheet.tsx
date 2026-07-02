"use client";

import { PortalActionBottomSheet } from "@/components/shared/PortalActionBottomSheet";
import type { AdminDashboardNavItem } from "@/lib/admin/admin-dashboard-nav-config";

interface AdminMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: AdminDashboardNavItem[];
}

export function AdminMoreSheet({ open, onOpenChange, items }: AdminMoreSheetProps) {
  return (
    <PortalActionBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="More admin tools"
      subtitle="Billing, settings, and other admin areas."
      links={items.map((item) => ({
        href: item.href,
        label: item.label,
        icon: item.icon,
      }))}
    />
  );
}
