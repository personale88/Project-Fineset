"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { content } from "@/content/en";
import { useManagerActor } from "@/components/store/ManagerActorProvider";
import { useStaffDigest } from "@/hooks/useStaffWorkQueue";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ManagerNotificationBell() {
  const copy = content.store.managerShell.notifications;
  const actorCopy = content.store.managerShell.actorSetup;
  const { staffLinked } = useManagerActor();
  const { data } = useStaffDigest({ enabled: staffLinked });

  const count = staffLinked ? (data?.overdue ?? 0) + (data?.dueToday ?? 0) : 0;

  return (
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
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>{copy.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!staffLinked ? (
          <>
            <DropdownMenuItem disabled>{copy.unlinked}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`${STORE_MANAGER_DASHBOARD_PATH}/staff`}>
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
