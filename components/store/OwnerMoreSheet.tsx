"use client";

import {
  BarChart3,
  History,
  Route,
  User,
} from "lucide-react";
import { content } from "@/content/en";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { PortalActionBottomSheet } from "@/components/shared/PortalActionBottomSheet";
import {
  businessOwnerProfilePath,
  portalSectionPath,
  storeDetailPathForRole,
} from "@/lib/utils/store-dashboard-url";

interface OwnerMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnerMoreSheet({ open, onOpenChange }: OwnerMoreSheetProps) {
  const copy = content.store.ownerShell.moreSheet;
  const { storeId } = useStoreDashboard();

  const links = [
    {
      href: businessOwnerProfilePath(),
      label: copy.profile,
      icon: User,
    },
    {
      href: portalSectionPath("visits", "BUSINESS_OWNER", storeId),
      label: copy.visitsLog,
      icon: History,
    },
    {
      href: portalSectionPath("field-sales", "BUSINESS_OWNER", storeId),
      label: copy.fieldSalesLog,
      icon: Route,
    },
    ...(storeId
      ? [
          {
            href: storeDetailPathForRole(storeId, "BUSINESS_OWNER"),
            label: copy.analytics,
            icon: BarChart3,
          },
        ]
      : []),
  ];

  return (
    <PortalActionBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      subtitle={copy.subtitle}
      links={links}
    />
  );
}
