"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { portalHeaderActionButtonClass } from "@/components/layout/portal-header-button";

interface NotificationTriggerProps extends React.ComponentPropsWithoutRef<typeof Button> {
  count: number;
  title: string;
}

export const NotificationTrigger = React.forwardRef<
  HTMLButtonElement,
  NotificationTriggerProps
>(function NotificationTrigger({ count, title, className, ...props }, ref) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="outline"
      size="sm"
      className={portalHeaderActionButtonClass}
      aria-label={title}
      {...props}
    >
      <Bell className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{title}</span>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warning px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Button>
  );
});
