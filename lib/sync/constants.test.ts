import { describe, expect, it } from "vitest";
import {
  LIVE_QUERY_OPTIONS,
  queryOptionsForHydration,
  SSE_INVALIDATION_DEBOUNCE_MS,
  SSE_RECONNECT_MAX_MS,
  SSR_HYDRATED_QUERY_OPTIONS,
  STAFF_FILTER_QUERY_OPTIONS,
} from "@/lib/sync/constants";

describe("sync constants performance", () => {
  it("keeps live queries immediately stale for realtime refresh", () => {
    expect(LIVE_QUERY_OPTIONS.staleTime).toBe(0);
    expect(LIVE_QUERY_OPTIONS.refetchOnWindowFocus).toBe(true);
  });

  it("still refetches hydrated SSR queries on mount", () => {
    expect(queryOptionsForHydration(true)).toEqual(SSR_HYDRATED_QUERY_OPTIONS);
    expect(SSR_HYDRATED_QUERY_OPTIONS.refetchOnMount).toBe("always");
  });

  it("uses 120s staleTime for staff filter dropdowns", () => {
    expect(STAFF_FILTER_QUERY_OPTIONS.staleTime).toBe(120_000);
    expect(STAFF_FILTER_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
  });

  it("debounces SSE invalidation at 750ms", () => {
    expect(SSE_INVALIDATION_DEBOUNCE_MS).toBe(750);
  });

  it("caps SSE reconnect backoff", () => {
    expect(SSE_RECONNECT_MAX_MS).toBe(30_000);
  });
});
