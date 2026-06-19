import { StaffMyVisits } from "@/components/staff/StaffMyVisits";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export default function StoreManagerMyVisitsPage() {
  return (
    <StaffMyVisits portalBasePath={STORE_MANAGER_DASHBOARD_PATH} personalScope />
  );
}
