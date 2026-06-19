import { content } from "@/content/en";
import { ManagerWorkHub } from "@/components/store/ManagerWorkHub";
import { requirePortalSession } from "@/lib/auth/require-portal-session";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { storeManagerDetailPath } from "@/lib/utils/store-dashboard-url";

export default async function StoreManagerTeamHubPage() {
  const session = await requirePortalSession("STORE_MANAGER");
  const hub = content.store.managerShell.hubs.team;
  const actions = content.store.managerDashboard.actions.team;

  return (
    <ManagerWorkHub
      title={hub.title}
      subtitle={hub.subtitle}
      links={[
        {
          href: `${STORE_MANAGER_DASHBOARD_PATH}/calls`,
          title: actions.teamCalls.title,
          description: actions.teamCalls.description,
        },
        {
          href: `${STORE_MANAGER_DASHBOARD_PATH}/follow-ups`,
          title: content.store.managerShell.moreSheet.teamFollowUps,
          description: content.store.managerDashboard.followUps.store.subtitle,
        },
        {
          href: `${STORE_MANAGER_DASHBOARD_PATH}/visits`,
          title: actions.visitsLog.title,
          description: actions.visitsLog.description,
        },
        {
          href: `${STORE_MANAGER_DASHBOARD_PATH}/field-sales`,
          title: actions.fieldSalesLog.title,
          description: actions.fieldSalesLog.description,
        },
        {
          href: `${STORE_MANAGER_DASHBOARD_PATH}/staff`,
          title: actions.staffRoster.title,
          description: actions.staffRoster.description,
        },
        {
          href: storeManagerDetailPath(session.storeId),
          title: actions.storeDashboard.title,
          description: actions.storeDashboard.description,
        },
      ]}
    />
  );
}
