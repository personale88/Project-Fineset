"use client";

import Link from "next/link";
import { ClipboardList, MapPin } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ManagerLogSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManagerLogSheet({ open, onOpenChange }: ManagerLogSheetProps) {
  const copy = content.store.managerShell.logSheet;
  const actorCopy = content.store.managerShell.actorSetup;
  const { staffLinked } = useManagerActor();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {staffLinked ? copy.subtitle : actorCopy.subtitle}
          </DialogDescription>
        </DialogHeader>
        {staffLinked ? (
          <div className="grid gap-2">
            <Link
              href={`${STORE_MANAGER_DASHBOARD_PATH}/log-visit`}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-card border border-border px-4 py-4 hover:border-brand-gold/35"
            >
              <ClipboardList className="h-5 w-5 text-brand-gold" aria-hidden />
              <span className="font-medium">{copy.logVisit}</span>
            </Link>
            <Link
              href={`${STORE_MANAGER_DASHBOARD_PATH}/log-field-sale`}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 rounded-card border border-border px-4 py-4 hover:border-brand-gold/35"
            >
              <MapPin className="h-5 w-5 text-brand-gold" aria-hidden />
              <span className="font-medium">{copy.logFieldSale}</span>
            </Link>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{actorCopy.body}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
