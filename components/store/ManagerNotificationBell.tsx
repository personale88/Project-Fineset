"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Clock, Home, Users } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { useStaffDigest } from "@/hooks/useStaffWorkQueue";
import { useMaxSm } from "@/hooks/useMaxSm";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { portalProfileSectionPath } from "@/lib/utils/store-dashboard-url";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { Button } from "@/components/ui/button";
import { portalHeaderActionButtonClass } from "@/components/layout/portal-header-button";
import { PortalBottomSheet } from "@/components/shared/PortalBottomSheet";
import {
  PortalBottomSheetLinkList,
  type PortalBottomSheetLinkItem,
} from "@/components/shared/PortalBottomSheetLinks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function NotificationTrigger({
  count,
  title,
  onClick,
}: {
  count: number;
  title: string;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={portalHeaderActionButtonClass}
      aria-label={title}
      onClick={onClick}
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
}

export function ManagerNotificationBell() {
  const copy = content.store.managerShell.notifications;
  const actorCopy = content.store.managerShell.actorSetup;
  const isMobile = useMaxSm();
  const [open, setOpen] = useState(false);
  const { staffLinked } = useManagerActor();
  const { data } = useStaffDigest({ enabled: staffLinked });

  const count = staffLinked ? (data?.overdue ?? 0) + (data?.dueToday ?? 0) : 0;

  const sheetLinks = useMemo<PortalBottomSheetLinkItem[]>(() => {
    if (!staffLinked) {
      return [
        {
          key: "staff-roster",
          href: portalProfileSectionPath("STORE_MANAGER", "staff"),
          label: actorCopy.viewStaffRoster,
          icon: Users,
        },
      ];
    }

    if (!data || data.total === 0) return [];

    const links: PortalBottomSheetLinkItem[] = [];

    if (data.overdue > 0) {
      links.push({
        key: "overdue",
        href: buildFollowUpsHref(`${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`, "overdue"),
        label: copy.overdue.replace("{count}", String(data.overdue)),
        icon: Clock,
      });
    }

    if (data.dueToday > 0) {
      links.push({
        key: "due-today",
        href: buildFollowUpsHref(`${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`, "due_today"),
        label: copy.dueToday.replace("{count}", String(data.dueToday)),
        icon: Clock,
      });
    }

    links.push({
      key: "home",
      href: STORE_MANAGER_DASHBOARD_PATH,
      label: copy.openHome,
      icon: Home,
    });

    return links;
  }, [
    actorCopy.viewStaffRoster,
    copy.dueToday,
    copy.openHome,
    copy.overdue,
    data,
    staffLinked,
  ]);

  const emptyMessage = !staffLinked ? copy.unlinked : copy.empty;

  if (isMobile) {
    return (
      <>
        <NotificationTrigger count={count} title={copy.title} onClick={() => setOpen(true)} />
        <PortalBottomSheet
          open={open}
          onOpenChange={setOpen}
          title={copy.title}
          subtitle={sheetLinks.length === 0 ? emptyMessage : undefined}
        >
          <PortalBottomSheetLinkList
            links={sheetLinks}
            onNavigate={() => setOpen(false)}
            emptyMessage={emptyMessage}
          />
        </PortalBottomSheet>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NotificationTrigger count={count} title={copy.title} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{copy.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!staffLinked ? (
          <>
            <DropdownMenuItem disabled>{copy.unlinked}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={portalProfileSectionPath("STORE_MANAGER", "staff")}>
                {actorCopy.viewStaffRoster}
              </Link>
            </DropdownMenuItem>
          </>
        ) : !data || data.total === 0 ? (
          <DropdownMenuItem disabled>{copy.empty}</DropdownMenuItem>
        ) : (
          <>
            {data.overdue > 0 ? (
              <DropdownMenuItem asChild>
                <Link
                  href={buildFollowUpsHref(
                    `${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`,
                    "overdue",
                  )}
                >
                  {copy.overdue.replace("{count}", String(data.overdue))}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {data.dueToday > 0 ? (
              <DropdownMenuItem asChild>
                <Link
                  href={buildFollowUpsHref(
                    `${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`,
                    "due_today",
                  )}
                >
                  {copy.dueToday.replace("{count}", String(data.dueToday))}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={STORE_MANAGER_DASHBOARD_PATH}>{copy.openHome}</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
