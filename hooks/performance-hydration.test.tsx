// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import { createQueryWrapper } from "@/tests/helpers/query-client-wrapper";
import {
  LIVE_QUERY_OPTIONS,
  SSR_HYDRATED_QUERY_OPTIONS,
  STAFF_FILTER_QUERY_OPTIONS,
} from "@/lib/sync/constants";
import { useVisits } from "./useVisits";
import { usePortalCalls } from "./usePortalCalls";
import { useFieldSalesList } from "./useFieldSalesList";
import { useStoreStaff } from "./useStaff";
import { useStoreOverviewBundle } from "./useStoreOverviewBundle";
import { useStoreManagerPortfolio } from "./useStoreManagerPortfolio";
import * as visitsApi from "@/lib/api/visits";
import * as callsApi from "@/lib/api/calls";
import * as fieldSalesApi from "@/lib/api/field-sales";
import * as staffApi from "@/lib/api/staff";
import * as analyticsApi from "@/lib/api/analytics";
import {
  defaultFieldSalesParams,
  defaultPortalCallsParams,
} from "@/lib/query/initial-data";
import type { StoreManagerPortfolio } from "@/types";

vi.mock("@/lib/api/visits");
vi.mock("@/lib/api/calls");
vi.mock("@/lib/api/field-sales");
vi.mock("@/lib/api/staff");
vi.mock("@/lib/api/analytics");

const visitsInitial = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 20,
};

const portalInitial = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 15,
  year: 2026,
  month: 6,
  filters: {
    segments: [],
    valueTiers: [],
    queues: [],
    masters: [
      { key: "ALL" as const, count: 0 },
      { key: "STORE_VISIT" as const, count: 0 },
      { key: "FIELD_SALE" as const, count: 0 },
      { key: "EXTERNAL" as const, count: 0 },
    ],
    birthdays: [],
    anniversaries: [],
    months: [],
    availableYears: [2026],
  },
};

const fieldSalesInitial = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 15,
  year: 2026,
  month: 6,
  filters: { months: [], availableYears: [2026] },
};

const staffInitial = [{ id: "staff-1", name: "Alex", visitCount: 0 }];

const portfolioInitial: StoreManagerPortfolio = {
  period: "week",
  stores: [],
};

describe("React Query hydration performance contract", () => {
  beforeEach(() => {
    vi.mocked(visitsApi.getVisits).mockResolvedValue(visitsInitial);
    vi.mocked(callsApi.getPortalCalls).mockResolvedValue(portalInitial);
    vi.mocked(fieldSalesApi.getFieldSalesList).mockResolvedValue(fieldSalesInitial);
    vi.mocked(staffApi.getStaff).mockResolvedValue(staffInitial as never);
    vi.mocked(analyticsApi.getStoreOverviewBundle).mockResolvedValue({
      period: "week",
      storeId: "store-1",
      myStores: { data: [], selectedStoreId: "store-1" },
      kpis: {} as never,
      calls: {} as never,
      fieldSales: {} as never,
      rsoPerformance: {
        period: "week",
        periodRange: { start: "", end: "" },
        rows: [],
        topPerformer: null,
        mostImproved: null,
      },
    });
    vi.mocked(analyticsApi.getStoreManagerPortfolio).mockResolvedValue(portfolioInitial);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("useVisits shows SSR data and refetches on mount when SSR params match", async () => {
    const params = { page: "1", pageSize: "20", sortBy: "visitDate", sortOrder: "desc" as const };
    const { result } = renderHook(
      () =>
        useVisits(params, {
          initialData: visitsInitial,
          initialParams: params,
        }),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.data).toEqual(visitsInitial);
    await waitFor(() => {
      expect(visitsApi.getVisits).toHaveBeenCalledWith(params);
    });
  });

  it("useVisits fetches once when SSR params differ", async () => {
    const { result } = renderHook(
      () =>
        useVisits(
          { page: "2", pageSize: "20" },
          {
            initialData: visitsInitial,
            initialParams: { page: "1", pageSize: "20" },
          },
        ),
      { wrapper: createQueryWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(visitsApi.getVisits).toHaveBeenCalledTimes(1);
  });

  it("usePortalCalls shows SSR data and refetches on mount when SSR params match", async () => {
    const params = defaultPortalCallsParams("store-1");
    const { result } = renderHook(
      () =>
        usePortalCalls(params, {
          initialData: portalInitial,
          initialParams: params,
        }),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.data).toEqual(portalInitial);
    await waitFor(() => {
      expect(callsApi.getPortalCalls).toHaveBeenCalledWith(params);
    });
  });

  it("useFieldSalesList shows SSR data and refetches on mount when SSR params match", async () => {
    const params = defaultFieldSalesParams("store-1");
    const { result } = renderHook(
      () =>
        useFieldSalesList(params, {
          initialData: fieldSalesInitial,
          initialParams: params,
        }),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.data).toEqual(fieldSalesInitial);
    await waitFor(() => {
      expect(fieldSalesApi.getFieldSalesList).toHaveBeenCalledWith(params);
    });
  });

  it("useStoreStaff shows SSR data and refetches on mount when initialData provided", async () => {
    const { result } = renderHook(
      () =>
        useStoreStaff("store-1", {
          initialData: staffInitial as never,
        }),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.data).toEqual(staffInitial);
    await waitFor(() => {
      expect(staffApi.getStaff).toHaveBeenCalledWith("store-1");
    });
  });

  it("useStoreOverviewBundle shows SSR data and refetches on mount when SSR params match", async () => {
    const params = { period: "week" as const, storeId: "store-1" };
    const { result } = renderHook(
      () =>
        useStoreOverviewBundle(params, {
          initialBundle: {
            myStores: { data: [], selectedStoreId: "store-1" },
            kpis: {} as never,
            calls: {} as never,
            fieldSales: {} as never,
            rsoPerformance: {
              period: "week",
              periodRange: { start: "", end: "" },
              rows: [],
              topPerformer: null,
              mostImproved: null,
            },
          },
          initialParams: params,
        }),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.data?.storeId).toBe("store-1");
    await waitFor(() => {
      expect(analyticsApi.getStoreOverviewBundle).toHaveBeenCalledWith(params);
    });
  });

  it("useStoreManagerPortfolio hydrates SSR data then refetches on mount", async () => {
    const params = { period: "week" as const };
    const { result } = renderHook(
      () =>
        useStoreManagerPortfolio(params, {
          initialData: portfolioInitial,
          initialParams: params,
        }),
      { wrapper: createQueryWrapper() },
    );

    expect(result.current.data).toEqual(portfolioInitial);
    await waitFor(() => {
      expect(analyticsApi.getStoreManagerPortfolio).toHaveBeenCalledWith(params);
    });
  });

  it("hydrated hooks merge SSR_HYDRATED_QUERY_OPTIONS", () => {
    const client = new QueryClient();
    const wrapper = createQueryWrapper(client);
    const params = { page: "1", pageSize: "20", sortBy: "visitDate", sortOrder: "desc" as const };

    renderHook(
      () =>
        useVisits(params, {
          initialData: visitsInitial,
          initialParams: params,
        }),
      { wrapper },
    );

    const query = client.getQueryCache().find({ queryKey: ["visits", params] });
    const options = query?.options as {
      refetchOnMount?: boolean;
      staleTime?: number;
    };
    expect(options.refetchOnMount).toBe(SSR_HYDRATED_QUERY_OPTIONS.refetchOnMount);
    expect(options.staleTime).toBe(SSR_HYDRATED_QUERY_OPTIONS.staleTime);
  });

  it("live query defaults refetch on window focus; staff filters do not", () => {
    expect(LIVE_QUERY_OPTIONS.refetchOnWindowFocus).toBe(true);
    expect(STAFF_FILTER_QUERY_OPTIONS.refetchOnWindowFocus).toBe(false);
    expect(STAFF_FILTER_QUERY_OPTIONS.staleTime).toBe(120_000);
  });
});
