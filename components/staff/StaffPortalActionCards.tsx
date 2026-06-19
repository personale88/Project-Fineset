"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ClipboardList,
  History,
  ListTodo,
  MapPin,
  Phone,
  Route,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFollowUps } from "@/hooks/useFollowUps";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildDefaultFollowUpsHref } from "@/lib/utils/follow-ups-url";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import type { Content } from "@/content/en";

type StaffContent = Content["staff"];

interface StaffPortalActionCardsProps {
  copy: StaffContent;
}

const actionIcons = {
  logVisit: ClipboardList,
  myVisits: History,
  callUsers: Phone,
  fieldSales: MapPin,
  myFieldSales: Route,
  followUps: ListTodo,
} as const;

export function StaffPortalActionCards({ copy }: StaffPortalActionCardsProps) {
  const followUpsBasePath = `${STAFF_DASHBOARD_PATH}/follow-ups`;
  const { data: openFollowUps, isError: followUpsError } = useFollowUps({ status: "OPEN" });

  const followUpCounts = useMemo(() => {
    const items = openFollowUps ?? [];
    return {
      dueToday: items.filter((item) => isDueTodayFollowUpDate(item.followUpDate)).length,
      overdue: items.filter((item) => isOverdueFollowUpDate(item.followUpDate)).length,
    };
  }, [openFollowUps]);

  const followUpsHref = followUpsError
    ? followUpsBasePath
    : buildDefaultFollowUpsHref(followUpsBasePath, followUpCounts);

  const actions = [
    {
      key: "logVisit" as const,
      href: `${STAFF_DASHBOARD_PATH}/log-visit`,
      ...copy.portal.actions.logVisit,
    },
    {
      key: "myVisits" as const,
      href: `${STAFF_DASHBOARD_PATH}/my-visits`,
      ...copy.portal.actions.myVisits,
    },
    {
      key: "callUsers" as const,
      href: `${STAFF_DASHBOARD_PATH}/calls`,
      ...copy.portal.actions.callUsers,
    },
    {
      key: "fieldSales" as const,
      href: `${STAFF_DASHBOARD_PATH}/field-sales`,
      ...copy.portal.actions.fieldSales,
    },
    {
      key: "myFieldSales" as const,
      href: `${STAFF_DASHBOARD_PATH}/my-field-sales`,
      ...copy.portal.actions.myFieldSales,
    },
    {
      key: "followUps" as const,
      href: followUpsHref,
      ...copy.portal.actions.followUps,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {actions.map((action) => {
        const Icon = actionIcons[action.key];

        return (
          <Link key={action.key} href={action.href} className="group block h-full">
            <Card className="flex h-full flex-col transition-shadow hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-brand-gold group-focus-visible:ring-offset-2">
              <CardHeader className="space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-card bg-brand-gold/10 text-brand-gold">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <CardTitle className="text-xl">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button className="w-full" tabIndex={-1}>
                  {action.cta}
                </Button>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
