import { useQuery } from "@tanstack/react-query";
import { getOwnerDashboardOverview } from "@/lib/api/owner-dashboard";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useOwnerDashboard(period: PeriodValue) {
  return useQuery({
    queryKey: ["owner-dashboard", period],
    queryFn: () => getOwnerDashboardOverview(period),
    ...LIVE_QUERY_OPTIONS,
  });
}
