import { useQuery } from "@tanstack/react-query";
import { getStoreOverviewBundle } from "@/lib/api/analytics";
import { analyticsParamsMatch } from "@/lib/query/initial-data";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";
import type { StoreOverviewBundle } from "@/lib/services/store-overview-bundle";
import type { GetAnalyticsParams } from "@/types";

interface UseStoreOverviewBundleOptions {
  initialBundle?: StoreOverviewBundle;
  initialParams?: GetAnalyticsParams;
}

export function useStoreOverviewBundle(
  params: GetAnalyticsParams = {},
  options?: UseStoreOverviewBundleOptions,
) {
  const useInitialData =
    options?.initialBundle &&
    options.initialParams &&
    analyticsParamsMatch(params, options.initialParams);

  return useQuery({
    queryKey: ["analytics", "store", "overview", params],
    queryFn: () => getStoreOverviewBundle(params),
    enabled: Boolean(params.storeId),
    initialData: useInitialData
      ? {
          period: options.initialParams!.period ?? "today",
          storeId: options.initialParams!.storeId ?? "",
          ...options.initialBundle!,
        }
      : undefined,
    ...LIVE_QUERY_OPTIONS,
    staleTime: useInitialData ? 60_000 : LIVE_QUERY_OPTIONS.staleTime,
    refetchOnMount: useInitialData ? false : undefined,
  });
}
