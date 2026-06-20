import { content } from "@/content/en";
import { StaffMyVisits } from "@/components/staff/StaffMyVisits";
import { ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { storeManagerMyWorkHubHref } from "@/lib/utils/store-dashboard-url";

export default function StoreManagerMyVisitsPage() {
  return (
    <ManagerActorSetupGate requireLink>
      <StaffMyVisits
        portalBasePath={STORE_MANAGER_DASHBOARD_PATH}
        backHref={storeManagerMyWorkHubHref()}
        personalScope
      />
    </ManagerActorSetupGate>
  );
}
