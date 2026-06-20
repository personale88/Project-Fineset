/** Shared React Query options for live backend-backed data. */
export const LIVE_QUERY_OPTIONS = {
  staleTime: 0,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: false,
} as const;

/** Staff filter dropdowns — share cache across portal tabs, refetch less often. */
export const STAFF_FILTER_QUERY_OPTIONS = {
  ...LIVE_QUERY_OPTIONS,
  staleTime: 120_000,
  refetchOnWindowFocus: false,
} as const;

/** After SSR hydration, still refetch immediately so portals stay in sync. */
export const SSR_HYDRATED_QUERY_OPTIONS = {
  refetchOnMount: "always" as const,
  staleTime: 0,
} as const;

export function queryOptionsForHydration(isHydrated: boolean) {
  return isHydrated ? SSR_HYDRATED_QUERY_OPTIONS : {};
}

/** Coalesce rapid SSE entity invalidations before refetching React Query caches. */
export const SSE_INVALIDATION_DEBOUNCE_MS = 750;

/** SSE heartbeat interval (ms). */
export const SSE_HEARTBEAT_MS = 30_000;

/** Close SSE before serverless hard timeout (Vercel ~300s). */
export const SSE_SERVER_MAX_CONNECTION_MS = 240_000;

/** Delay SSE connect so initial page data requests are not competing on cold load. */
export const SSE_CONNECT_DELAY_MS = 2_500;

/** SSE reconnect backoff base (ms). */
export const SSE_RECONNECT_BASE_MS = 1_000;

/** Max SSE reconnect backoff (ms). */
export const SSE_RECONNECT_MAX_MS = 30_000;

/** Stop reconnect loop after repeated failures. */
export const SSE_MAX_CONSECUTIVE_ERRORS = 6;
