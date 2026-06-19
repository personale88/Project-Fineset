"use client";

import Link from "next/link";
import { ClipboardList, MapPin } from "lucide-react";
import { content } from "@/content/en";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StaffLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StaffLogSheet({ open, onOpenChange }: StaffLogSheetProps) {
  const copy = content.staff.logSheet;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2">
          <Link
            href={`${STAFF_DASHBOARD_PATH}/log-visit`}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-card border border-border px-4 py-4 hover:border-brand-gold/35"
          >
            <ClipboardList className="h-5 w-5 text-brand-gold" aria-hidden />
            <span className="font-medium">{copy.visit}</span>
          </Link>
          <Link
            href={`${STAFF_DASHBOARD_PATH}/field-sales`}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 rounded-card border border-border px-4 py-4 hover:border-brand-gold/35"
          >
            <MapPin className="h-5 w-5 text-brand-gold" aria-hidden />
            <span className="font-medium">{copy.fieldSale}</span>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
