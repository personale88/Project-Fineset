"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface PortalBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  contentClassName?: string;
  bodyClassName?: string;
}

export function PortalBottomSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  children,
  contentClassName,
  bodyClassName,
}: PortalBottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={cn("gap-0 px-0 pt-2", contentClassName)}>
        <div
          className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-border"
          aria-hidden
        />

        <SheetHeader className="shrink-0 space-y-1 border-0 px-5 pb-4 pt-0 pr-14 text-left">
          <SheetTitle className="text-xl">{title}</SheetTitle>
          {subtitle ? (
            <SheetDescription className="text-text-muted">{subtitle}</SheetDescription>
          ) : null}
        </SheetHeader>

        <SheetBody className={cn("overflow-visible px-4 py-0", bodyClassName)}>
          {children}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
