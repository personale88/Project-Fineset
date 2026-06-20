"use client";

import { useMemo } from "react";
import { ManagerWorkHub } from "@/components/store/ManagerWorkHub";
import type { ManagerHubLink } from "@/components/store/manager-nav-links";
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

  const actions = copy.portal.actions;
  const base = STAFF_DASHBOARD_PATH;

  const links: ManagerHubLink[] = [
    {
      id: "logVisit",
      href: `${base}/log-visit`,
      title: actions.logVisit.title,
      description: actions.logVisit.description,
      cta: actions.logVisit.cta,
    },
    {
      id: "myVisits",
      href: `${base}/my-visits`,
      title: actions.myVisits.title,
      description: actions.myVisits.description,
      cta: actions.myVisits.cta,
    },
    {
      id: "callUsers",
      href: `${base}/calls`,
      title: actions.callUsers.title,
      description: actions.callUsers.description,
      cta: actions.callUsers.cta,
    },
    {
      id: "logFieldSale",
      href: `${base}/field-sales`,
      title: actions.fieldSales.title,
      description: actions.fieldSales.description,
      cta: actions.fieldSales.cta,
    },
    {
      id: "myFieldSales",
      href: `${base}/my-field-sales`,
      title: actions.myFieldSales.title,
      description: actions.myFieldSales.description,
      cta: actions.myFieldSales.cta,
    },
    {
      id: "followUps",
      href: followUpsHref,
      title: actions.followUps.title,
      description: actions.followUps.description,
      cta: actions.followUps.cta,
    },
  ];

  return (
    <ManagerWorkHub
      linksOnly
      title={copy.portal.title}
      subtitle={copy.portal.subtitle}
      links={links}
    />
  );
}
