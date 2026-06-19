import { content } from "@/content/en";
import { StaffMyFieldSales } from "@/components/staff/StaffMyFieldSales";
import { STORE_MANAGER_DASHBOARD_PATH } from "@/lib/auth/routes";

export default function StoreManagerMyFieldSalesPage() {
  return (
    <StaffMyFieldSales
      copy={content.staff.myFieldSales}
      portalBasePath={STORE_MANAGER_DASHBOARD_PATH}
      personalScope
    />
  );
}
