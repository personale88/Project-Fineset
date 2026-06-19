"use client";

import Link from "next/link";
import { ClipboardList, History, ListTodo, MapPin, Route, Search } from "lucide-react";
import { content } from "@/content/en";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StaffMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const links = [
  { href: `${STAFF_DASHBOARD_PATH}/my-visits`, icon: History, labelKey: "myVisits" as const },
  { href: `${STAFF_DASHBOARD_PATH}/my-field-sales`, icon: Route, labelKey: "myFieldSales" as const },
  { href: `${STAFF_DASHBOARD_PATH}/follow-ups`, icon: ListTodo, labelKey: "followUps" as const },
  { href: `${STAFF_DASHBOARD_PATH}/field-sales`, icon: MapPin, labelKey: "fieldSales" as const },
  { href: `${STAFF_DASHBOARD_PATH}/log-visit`, icon: ClipboardList, labelKey: "logVisit" as const },
];

export function StaffMoreSheet({ open, onOpenChange }: StaffMoreSheetProps) {
  const copy = content.staff.moreSheet;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <ul className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const action = content.staff.portal.actions[link.labelKey];
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 rounded-card px-3 py-3 text-sm font-medium text-text-primary hover:bg-surface-secondary"
                >
                  <Icon className="h-5 w-5 text-brand-gold" aria-hidden />
                  {action.title}
                </Link>
              </li>
            );
          })}
          <li>
            <p className="flex items-center gap-3 rounded-card px-3 py-3 text-sm text-text-muted">
              <Search className="h-5 w-5 text-brand-gold" aria-hidden />
              {copy.searchHint}
            </p>
          </li>
        </ul>
      </DialogContent>
    </Dialog>
  );
}
