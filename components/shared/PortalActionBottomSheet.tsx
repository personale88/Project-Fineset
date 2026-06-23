"use client";

import { PortalBottomSheet } from "@/components/shared/PortalBottomSheet";
import {
  PortalBottomSheetLinkList,
  type PortalBottomSheetLinkItem,
} from "@/components/shared/PortalBottomSheetLinks";
import type { LucideIcon } from "lucide-react";

export interface PortalActionSheetLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface PortalActionBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  links: PortalActionSheetLink[];
  emptyMessage?: string;
}

export function PortalActionBottomSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  links,
  emptyMessage,
}: PortalActionBottomSheetProps) {
  const sheetLinks: PortalBottomSheetLinkItem[] = links.map((link) => ({
    key: link.href,
    href: link.href,
    label: link.label,
    icon: link.icon,
  }));

  return (
    <PortalBottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      subtitle={subtitle}
    >
      <PortalBottomSheetLinkList
        links={sheetLinks}
        onNavigate={() => onOpenChange(false)}
        emptyMessage={emptyMessage}
      />
    </PortalBottomSheet>
  );
}
