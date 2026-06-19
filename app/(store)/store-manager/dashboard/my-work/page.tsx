import { content } from "@/content/en";
import { ManagerWorkHub } from "@/components/store/ManagerWorkHub";
import { ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export default function StoreManagerMyWorkPage() {
  const hub = content.store.managerShell.hubs.myWork;
  const actions = content.store.managerDashboard.actions.personal;

  return (
    <ManagerActorSetupGate requireLink>
      <ManagerWorkHub
        title={hub.title}
        subtitle={hub.subtitle}
        links={[
          {
            href: `${STORE_MANAGER_DASHBOARD_PATH}/my-calls`,
            title: actions.callUsers.title,
            description: actions.callUsers.description,
          },
          {
            href: `${STORE_MANAGER_DASHBOARD_PATH}/my-follow-ups`,
            title: actions.followUps.title,
            description: actions.followUps.description,
          },
          {
            href: `${STORE_MANAGER_DASHBOARD_PATH}/my-visits`,
            title: actions.myVisits.title,
            description: actions.myVisits.description,
          },
          {
            href: `${STORE_MANAGER_DASHBOARD_PATH}/my-field-sales`,
            title: actions.myFieldSales.title,
            description: actions.myFieldSales.description,
          },
          {
            href: `${STORE_MANAGER_DASHBOARD_PATH}/log-visit`,
            title: actions.logVisit.title,
            description: actions.logVisit.description,
          },
          {
            href: `${STORE_MANAGER_DASHBOARD_PATH}/log-field-sale`,
            title: actions.fieldSales.title,
            description: actions.fieldSales.description,
          },
        ]}
      />
    </ManagerActorSetupGate>
  );
}
