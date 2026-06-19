"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  BarChart3,
  ClipboardList,
  History,
  ListTodo,
  MapPin,
  Phone,
  Route,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFollowUps } from "@/hooks/useFollowUps";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildDefaultFollowUpsHref } from "@/lib/utils/follow-ups-url";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import type { Content } from "@/content/en";

type StoreContent = Content["store"];

interface StoreManagerActionCardsProps {
  copy: StoreContent;
  storeId: string;
}

const personalIcons = {
  logVisit: ClipboardList,
  myVisits: History,
  callUsers: Phone,
  fieldSales: MapPin,
  myFieldSales: Route,
  followUps: ListTodo,
} as const;

const teamIcons = {
  teamCalls: Phone,
  visitsLog: ClipboardList,
  fieldSalesLog: MapPin,
  staffRoster: Users,
  storeDashboard: BarChart3,
} as const;

export function StoreManagerActionCards({ copy, storeId }: StoreManagerActionCardsProps) {
  const actionCopy = copy.managerDashboard.actions;
  const { data: openFollowUps, isError: followUpsError } = useFollowUps({
    storeId,
    status: "OPEN",
    personalScope: true,
  });

  const followUpCounts = useMemo(() => {
    const items = openFollowUps ?? [];
    return {
      dueToday: items.filter((item) => isDueTodayFollowUpDate(item.followUpDate)).length,
      overdue: items.filter((item) => isOverdueFollowUpDate(item.followUpDate)).length,
    };
  }, [openFollowUps]);

  const followUpsHref = followUpsError
    ? `${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`
    : buildDefaultFollowUpsHref(`${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`, followUpCounts);

  const personalActions = [
    {
      key: "logVisit" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/log-visit`,
      ...actionCopy.personal.logVisit,
    },
    {
      key: "myVisits" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/my-visits`,
      ...actionCopy.personal.myVisits,
    },
    {
      key: "callUsers" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/my-calls`,
      ...actionCopy.personal.callUsers,
    },
    {
      key: "fieldSales" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/log-field-sale`,
      ...actionCopy.personal.fieldSales,
    },
    {
      key: "myFieldSales" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/my-field-sales`,
      ...actionCopy.personal.myFieldSales,
    },
    {
      key: "followUps" as const,
      href: followUpsHref,
      ...actionCopy.personal.followUps,
    },
  ];

  const teamActions = [
    {
      key: "teamCalls" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/calls`,
      ...actionCopy.team.teamCalls,
    },
    {
      key: "visitsLog" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/visits`,
      ...actionCopy.team.visitsLog,
    },
    {
      key: "fieldSalesLog" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/field-sales`,
      ...actionCopy.team.fieldSalesLog,
    },
    {
      key: "staffRoster" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/staff`,
      ...actionCopy.team.staffRoster,
    },
    {
      key: "storeDashboard" as const,
      href: `${STORE_MANAGER_DASHBOARD_PATH}/stores/${storeId}`,
      ...actionCopy.team.storeDashboard,
    },
  ];

  function renderActionGrid(
    actions: Array<{
      key: string;
      href: string;
      title: string;
      description: string;
      cta: string;
    }>,
    icons: Record<string, React.ComponentType<{ className?: string }>>,
  ) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((action) => {
          const Icon = icons[action.key];
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

  return (
    <section>
      <Tabs defaultValue="team" className="w-full">
        <TabsList
          aria-label={actionCopy.teamSectionTitle}
          className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0"
        >
          <TabsTrigger
            value="team"
            className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-sm font-medium text-text-muted shadow-none transition-colors hover:text-text-primary data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-text-primary data-[state=active]:shadow-none"
          >
            {actionCopy.tabTeam}
          </TabsTrigger>
          <TabsTrigger
            value="personal"
            className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-sm font-medium text-text-muted shadow-none transition-colors hover:text-text-primary data-[state=active]:border-brand-gold data-[state=active]:bg-transparent data-[state=active]:text-text-primary data-[state=active]:shadow-none"
          >
            {actionCopy.tabPersonal}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="mt-5 focus-visible:outline-none">
          <p className="mb-4 text-sm text-text-muted">{actionCopy.teamSectionSubtitle}</p>
          {renderActionGrid(teamActions, teamIcons)}
        </TabsContent>

        <TabsContent value="personal" className="mt-5 focus-visible:outline-none">
          <p className="mb-4 text-sm text-text-muted">{actionCopy.personalSectionSubtitle}</p>
          {renderActionGrid(personalActions, personalIcons)}
        </TabsContent>
      </Tabs>
    </section>
  );
}
