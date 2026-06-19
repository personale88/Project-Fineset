"use client";

import Link from "next/link";
import { content } from "@/content/en";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { storeManagerDetailPath } from "@/lib/utils/store-dashboard-url";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManagerMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagerMoreSheet({ open, onOpenChange }: ManagerMoreSheetProps) {
  const copy = content.store.managerShell.moreSheet;
  const { storeId } = useStoreDashboard();

  const links = [
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/my-visits`, label: copy.myVisits },
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/my-field-sales`, label: copy.myFieldSales },
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`, label: copy.myFollowUps },
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`, label: copy.teamFollowUps },
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/visits`, label: copy.visitsLog },
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/field-sales`, label: copy.fieldSalesLog },
    { href: `${STORE_MANAGER_DASHBOARD_PATH}/staff`, label: copy.staff },
    ...(storeId
      ? [{ href: storeManagerDetailPath(storeId), label: copy.analytics }]
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
