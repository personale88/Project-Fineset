import { content } from "@/content/en";
import { StaffMyFieldSales } from "@/components/staff/StaffMyFieldSales";
import { ManagerActorSetupGate } from "@/components/store/ManagerActorSetupGate";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";
import { storeManagerMyWorkHubHref } from "@/lib/utils/store-dashboard-url";

export default function StoreManagerMyFieldSalesPage() {
  return (
    <ManagerActorSetupGate requireLink>
      <StaffMyFieldSales
        copy={content.staff.myFieldSales}
        portalBasePath={STORE_MANAGER_DASHBOARD_PATH}
        backHref={storeManagerMyWorkHubHref()}
        personalScope
      />
    </ManagerActorSetupGate>
  );
}
