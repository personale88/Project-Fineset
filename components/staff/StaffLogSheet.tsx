"use client";

import { ClipboardList, MapPin } from "lucide-react";
import { content } from "@/content/en";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { PortalActionBottomSheet } from "@/components/shared/PortalActionBottomSheet";

interface StaffLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffLogSheet({ open, onOpenChange }: StaffLogSheetProps) {
  const copy = content.staff.logSheet;

  return (
    <PortalActionBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      links={[
        {
          href: `${STAFF_DASHBOARD_PATH}/log-visit`,
          label: copy.visit,
          icon: ClipboardList,
        },
        {
          href: `${STAFF_DASHBOARD_PATH}/field-sales`,
          label: copy.fieldSale,
          icon: MapPin,
        },
      ]}
    />
  );
}
