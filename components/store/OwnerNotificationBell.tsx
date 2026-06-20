"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { content } from "@/content/en";
import { DashboardNotifications } from "@/components/dashboard/DashboardNotifications";
import { useStoreDashboard } from "@/components/store/StoreDashboardProvider";
import { useOwnerPeriodFromUrl } from "@/hooks/useOwnerPeriodFromUrl";
import { useStoreWorkQueue } from "@/hooks/useStoreWorkQueue";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function OwnerNotificationBellContent() {
  const copy = content.store.ownerShell.notifications;
  const period = useOwnerPeriodFromUrl();
  const {
    storeId,
    stores,
    hasMultipleStores,
    portfolioWorkQueueStoreId,
    setPortfolioWorkQueueStoreId,
  } = useStoreDashboard();
  const workQueueStoreId = portfolioWorkQueueStoreId;
  const { data } = useStoreWorkQueue(workQueueStoreId, 30, period);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStoreId, setDialogStoreId] = useState<string | null>(storeId);

  useEffect(() => {
    setDialogStoreId(workQueueStoreId ?? storeId);
  }, [storeId, workQueueStoreId]);

  const resolvedStoreId = dialogStoreId ?? stores[0]?.id;
  const linkStoreId = workQueueStoreId ?? storeId;
  const totals = data?.categoryTotals ?? {};
  const overdue = totals.overdue_task ?? 0;
  const dueToday = totals.due_today_task ?? 0;
  const notAnswered = totals.not_answered ?? 0;
  const followUpCalls = totals.follow_up_call ?? 0;
  const count = data?.total ?? 0;

  const quickLinks = useMemo(
    () =>
      [
        overdue > 0
          ? {
              label: copy.overdue.replace("{count}", String(overdue)),
              href: buildFollowUpsHref(
                portalSectionPath("follow-ups", "BUSINESS_OWNER", linkStoreId),
                "overdue",
              ),
            }
          : null,
        dueToday > 0
          ? {
              label: copy.dueToday.replace("{count}", String(dueToday)),
              href: buildFollowUpsHref(
                portalSectionPath("follow-ups", "BUSINESS_OWNER", linkStoreId),
                "due_today",
              ),
            }
          : null,
        notAnswered > 0
          ? {
              label: copy.notAnswered.replace("{count}", String(notAnswered)),
              href: portalSectionPath("calls", "BUSINESS_OWNER", linkStoreId),
            }
          : null,
        followUpCalls > 0
          ? {
              label: copy.followUpCalls.replace("{count}", String(followUpCalls)),
              href: portalSectionPath("calls", "BUSINESS_OWNER", linkStoreId),
            }
          : null,
      ].filter((item): item is { label: string; href: string } => item !== null),
    [copy, dueToday, followUpCalls, linkStoreId, notAnswered, overdue],
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative gap-1.5"
            aria-label={copy.title}
          >
            <Bell className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">{copy.title}</span>
            {count > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-warning px-1 text-[10px] font-bold text-white">
                {count > 9 ? "9+" : count}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuLabel>{copy.title}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {count === 0 ? (
            <DropdownMenuItem disabled>{copy.empty}</DropdownMenuItem>
          ) : (
            quickLinks.map((item) => (
              <DropdownMenuItem key={item.href + item.label} asChild>
                <Link href={item.href}>{item.label}</Link>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            {copy.openPanel}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={BUSINESS_OWNER_DASHBOARD_PATH}>{copy.openDashboard}</Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] w-[min(100vw-2rem,48rem)] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.subtitle}</DialogDescription>
          </DialogHeader>

          {hasMultipleStores ? (
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label={copy.storeFilter.label}
            >
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  aria-pressed={resolvedStoreId === store.id}
                  onClick={() => {
                    setDialogStoreId(store.id);
                    setPortfolioWorkQueueStoreId(store.id);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    resolvedStoreId === store.id
                      ? "border-brand-gold bg-brand-gold/10 text-text-primary"
                      : "border-border text-text-muted hover:border-brand-gold/30",
                  )}
                >
                  {store.name}
                </button>
              ))}
            </div>
          ) : null}

          {resolvedStoreId ? (
            <DashboardNotifications
              variant="business_owner"
              storeId={resolvedStoreId}
              presentation="standalone"
              readOnly
            />
          ) : (
            <p className="text-sm text-text-secondary">{copy.empty}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function OwnerNotificationBell() {
  return (
    <Suspense fallback={null}>
      <OwnerNotificationBellContent />
    </Suspense>
  );
}
