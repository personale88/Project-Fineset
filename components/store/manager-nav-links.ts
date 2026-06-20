import { content } from "@/content/en";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export type ManagerHubLinkId =
  | "teamCalls"
  | "followUps"
  | "visitsLog"
  | "staffRoster"
  | "activity"
  | "fieldSalesLog"
  | "myCalls"
  | "callUsers"
  | "myFollowUps"
  | "myVisits"
  | "myFieldSales"
  | "logVisit"
  | "logFieldSale";

export interface ManagerHubLink {
  id: ManagerHubLinkId;
  href: string;
  title: string;
  description: string;
  cta: string;
}

export function buildManagerMyWorkHubLinks(): ManagerHubLink[] {
  const actions = content.store.managerDashboard.actions.personal;
  const base = STORE_MANAGER_DASHBOARD_PATH;

  return [
    {
      id: "logVisit",
      href: `${base}/log-visit`,
      title: actions.logVisit.title,
      description: actions.logVisit.description,
      cta: actions.logVisit.cta,
    },
    {
      id: "myCalls",
      href: `${base}/my-calls`,
      title: actions.callUsers.title,
      description: actions.callUsers.description,
      cta: actions.callUsers.cta,
    },
    {
      id: "myFollowUps",
      href: `${base}/my-follow-ups`,
      title: actions.followUps.title,
      description: actions.followUps.description,
      cta: actions.followUps.cta,
    },
    {
      id: "myVisits",
      href: `${base}/my-visits`,
      title: actions.myVisits.title,
      description: actions.myVisits.description,
      cta: actions.myVisits.cta,
    },
    {
      id: "myFieldSales",
      href: `${base}/my-field-sales`,
      title: actions.myFieldSales.title,
      description: actions.myFieldSales.description,
      cta: actions.myFieldSales.cta,
    },
    {
      id: "logFieldSale",
      href: `${base}/log-field-sale`,
      title: actions.fieldSales.title,
      description: actions.fieldSales.description,
      cta: actions.fieldSales.cta,
    },
  ];
}

export function buildManagerTeamHubLinks(_storeId: string): ManagerHubLink[] {
  const actions = content.store.managerDashboard.actions.team;
  const followUps = content.store.managerDashboard.followUps.store;
  const shell = content.store.managerShell;
  const base = STORE_MANAGER_DASHBOARD_PATH;

  return [
    {
      id: "teamCalls",
      href: `${base}/calls`,
      title: actions.teamCalls.title,
      description: actions.teamCalls.description,
      cta: actions.teamCalls.cta,
    },
    {
      id: "followUps",
      href: `${base}/follow-ups`,
      title: followUps.title,
      description: followUps.subtitle,
      cta: followUps.cta,
    },
    {
      id: "visitsLog",
      href: `${base}/visits`,
      title: actions.visitsLog.title,
      description: actions.visitsLog.description,
      cta: actions.visitsLog.cta,
    },
    {
      id: "staffRoster",
      href: `${base}/staff`,
      title: actions.staffRoster.title,
      description: actions.staffRoster.description,
      cta: actions.staffRoster.cta,
    },
    {
      id: "activity",
      href: `${base}/activity`,
      title: shell.activityLog.title,
      description: shell.activityLog.hubDescription,
      cta: shell.activityLog.cta,
    },
    {
      id: "fieldSalesLog",
      href: `${base}/field-sales`,
      title: actions.fieldSalesLog.title,
      description: actions.fieldSalesLog.description,
      cta: actions.fieldSalesLog.cta,
    },
  ];
}
