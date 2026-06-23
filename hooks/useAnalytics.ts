import { useQuery } from "@tanstack/react-query";
import {
  getAdminDashboardOverview,
  getStoreAnalytics,
} from "@/lib/api/analytics";
import { LIVE_QUERY_OPTIONS, queryOptionsForHydration } from "@/lib/sync/constants";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import type {
  AdminDashboardOverview,
  AnalyticsData,
  GetAnalyticsParams,
} from "@/types";

function normalizeAdminOverview(data: AdminDashboardOverview): AdminDashboardOverview {
  const businesses = groupStoresByBusiness(data.stores);
  return {
    ...data,
    businesses,
    totalBusinesses: businesses.length,
    inactiveStores: data.inactiveStores ?? data.totalStores - data.activeStores,
  };
}

interface UseAnalyticsOptions<T> {
  initialData?: T;
  initialParams?: GetAnalyticsParams;
  enabled?: boolean;
}

export function useStoreAnalytics(
  params: GetAnalyticsParams = {},
  options?: UseAnalyticsOptions<AnalyticsData>,
) {
  const useInitialData = Boolean(options?.initialData);

  return useQuery({
    queryKey: ["analytics", "store", params],
    queryFn: () => getStoreAnalytics(params),
    enabled: options?.enabled !== false && Boolean(params.storeId),
    initialData: useInitialData ? options!.initialData : undefined,
    ...LIVE_QUERY_OPTIONS,
    ...queryOptionsForHydration(Boolean(useInitialData)),
  });
}

export function useAdminDashboardOverview(
  options?: UseAnalyticsOptions<AdminDashboardOverview>,
) {
  const normalizedInitial = options?.initialData
    ? normalizeAdminOverview(options.initialData)
    : undefined;

  return useQuery({
    queryKey: ["analytics", "admin", "overview", "v6"],
    queryFn: async () => normalizeAdminOverview(await getAdminDashboardOverview()),
    initialData: normalizedInitial,
    ...LIVE_QUERY_OPTIONS,
    refetchOnMount: "always",
  });
}
