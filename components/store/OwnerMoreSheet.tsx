"use client";

import Link from "next/link";
import { content } from "@/content/en";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import {
  portalSectionPath,
  storeDetailPathForRole,
} from "@/lib/utils/store-dashboard-url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OwnerMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OwnerMoreSheet({ open, onOpenChange }: OwnerMoreSheetProps) {
  const copy = content.store.ownerShell.moreSheet;
  const { storeId } = useStoreDashboard();

  const links = [
    { href: portalSectionPath("visits", "BUSINESS_OWNER", storeId), label: copy.visitsLog },
    { href: portalSectionPath("staff", "BUSINESS_OWNER", storeId), label: copy.staff },
    { href: portalSectionPath("audit", "BUSINESS_OWNER"), label: copy.auditLog },
    {
      href: portalSectionPath("field-sales", "BUSINESS_OWNER", storeId),
      label: copy.fieldSalesLog,
    },
    ...(storeId
      ? [
          {
            href: storeDetailPathForRole(storeId, "BUSINESS_OWNER"),
            label: copy.analytics,
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.subtitle}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="block rounded-card px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-brand-gold/[0.05]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
