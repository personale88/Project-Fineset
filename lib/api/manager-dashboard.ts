import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { ManagerDashboardOverview } from "@/lib/services/manager-dashboard";

export async function getManagerDashboardOverview(
  storeId: string,
): Promise<ManagerDashboardOverview> {
  return apiFetch<ManagerDashboardOverview>(
    `/api/dashboard/manager-overview${buildQueryString({ storeId })}`,
  );
}
