"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Home } from "lucide-react";
import { content } from "@/content/en";
import { useStaffDigest } from "@/hooks/useStaffWorkQueue";
import { useMaxSm } from "@/hooks/useMaxSm";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { requestStaffDigestNotification } from "@/lib/notifications/follow-up-digest";
import { NotificationTrigger } from "@/components/shared/NotificationTrigger";
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

export function StaffNotificationBell() {
  const copy = content.staff.notifications;
  const isMobile = useMaxSm();
  const [open, setOpen] = useState(false);
  const { data } = useStaffDigest();

  const count = (data?.overdue ?? 0) + (data?.dueToday ?? 0);

  useEffect(() => {
    if (!data || data.total === 0) return;
    void requestStaffDigestNotification(data);
  }, [data]);

  const sheetLinks = useMemo<PortalBottomSheetLinkItem[]>(() => {
    if (!data || data.total === 0) return [];

    const links: PortalBottomSheetLinkItem[] = [];

    if (data.overdue > 0) {
      links.push({
        key: "overdue",
        href: buildFollowUpsHref(`${STAFF_DASHBOARD_PATH}/follow-ups`, "overdue"),
        label: copy.overdue.replace("{count}", String(data.overdue)),
        icon: Clock,
      });
    }

    if (data.dueToday > 0) {
      links.push({
        key: "due-today",
        href: buildFollowUpsHref(`${STAFF_DASHBOARD_PATH}/follow-ups`, "due_today"),
        label: copy.dueToday.replace("{count}", String(data.dueToday)),
        icon: Clock,
      });
    }

    links.push({
      key: "home",
      href: STAFF_DASHBOARD_PATH,
      label: copy.openHome,
      icon: Home,
    });

    return links;
  }, [copy.dueToday, copy.openHome, copy.overdue, data]);

  if (isMobile) {
    return (
      <>
        <NotificationTrigger count={count} title={copy.title} onClick={() => setOpen(true)} />
        <PortalBottomSheet
          open={open}
          onOpenChange={setOpen}
          title={copy.title}
          subtitle={count > 0 ? undefined : copy.empty}
        >
          <PortalBottomSheetLinkList
            links={sheetLinks}
            onNavigate={() => setOpen(false)}
            emptyMessage={copy.empty}
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
        {!data || data.total === 0 ? (
          <DropdownMenuItem disabled>{copy.empty}</DropdownMenuItem>
        ) : (
          <>
            {data.overdue > 0 ? (
              <DropdownMenuItem asChild>
                <Link href={buildFollowUpsHref(`${STAFF_DASHBOARD_PATH}/follow-ups`, "overdue")}>
                  {copy.overdue.replace("{count}", String(data.overdue))}
                </Link>
              </DropdownMenuItem>
            ) : null}
            {data.dueToday > 0 ? (
              <DropdownMenuItem asChild>
                <Link
                  href={buildFollowUpsHref(`${STAFF_DASHBOARD_PATH}/follow-ups`, "due_today")}
                >
                  {copy.dueToday.replace("{count}", String(data.dueToday))}
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={STAFF_DASHBOARD_PATH}>{copy.openHome}</Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
