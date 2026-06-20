import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import type { OwnerDashboardOverview } from "@/lib/services/owner-dashboard";

export async function getOwnerDashboardOverview(
  period: PeriodValue,
): Promise<OwnerDashboardOverview> {
  return apiFetch<OwnerDashboardOverview>(
    `/api/dashboard/owner-overview${buildQueryString({ period })}`,
  );
}
