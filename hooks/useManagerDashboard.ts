import { useQuery } from "@tanstack/react-query";
import { getManagerDashboardOverview } from "@/lib/api/manager-dashboard";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useManagerDashboard(storeId: string) {
  return useQuery({
    queryKey: ["manager-dashboard", storeId],
    queryFn: () => getManagerDashboardOverview(storeId),
    ...LIVE_QUERY_OPTIONS,
  });
}
