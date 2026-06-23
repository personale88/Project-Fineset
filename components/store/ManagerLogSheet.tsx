"use client";

import { ClipboardList, MapPin } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { PortalActionBottomSheet } from "@/components/shared/PortalActionBottomSheet";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

interface ManagerLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagerLogSheet({ open, onOpenChange }: ManagerLogSheetProps) {
  const copy = content.store.managerShell.logSheet;
  const actorCopy = content.store.managerShell.actorSetup;
  const { staffLinked } = useManagerActor();

  return (
    <PortalActionBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      subtitle={staffLinked ? copy.subtitle : actorCopy.subtitle}
      links={
        staffLinked
          ? [
              {
                href: `${STORE_MANAGER_DASHBOARD_PATH}/log-visit`,
                label: copy.logVisit,
                icon: ClipboardList,
              },
              {
                href: `${STORE_MANAGER_DASHBOARD_PATH}/log-field-sale`,
                label: copy.logFieldSale,
                icon: MapPin,
              },
            ]
          : []
      }
      emptyMessage={staffLinked ? undefined : actorCopy.body}
    />
  );
}
