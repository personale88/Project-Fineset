import { cache } from "react";
import { getServerSession, requireRole } from "@/lib/auth/session";
import { resolveAccessibleStoreId } from "@/lib/services/manager-stores";
import {
  getAdminDashboardOverview,
  getAdminStoreDetailAnalytics,
  assertStoreExists,
  getStoreAnalytics,
  getStoreManagerPortfolio,
} from "@/lib/services/analytics";
import {
  getAdminStoreOverviewBundle,
  getStoreOverviewBundle,
  type StoreOverviewBundle,
} from "@/lib/services/store-overview-bundle";
import { DEFAULT_ANALYTICS_PARAMS } from "@/lib/query/initial-data";
import { normalizeStoreManagerPortfolio } from "@/lib/utils/normalize-store-performance";
import type {
  AdminDashboardOverview,
  AnalyticsData,
  GetAnalyticsParams,
  StoreDetailAnalytics,
  StoreManagerPortfolio,
} from "@/types";

export interface InitialStoreAnalyticsPayload {
  params: GetAnalyticsParams;
  data: AnalyticsData;
}

export interface InitialAdminOverviewPayload {
  params: GetAnalyticsParams;
  data: AdminDashboardOverview;
}

export interface InitialAdminStoreDetailPayload {
  storeId: string;
  params: GetAnalyticsParams;
  data: StoreDetailAnalytics;
}

export interface InitialStoreOverviewBundlePayload {
  params: GetAnalyticsParams;
  bundle: StoreOverviewBundle;
}

export interface InitialStoreManagerPortfolioPayload {
  params: GetAnalyticsParams;
  data: StoreManagerPortfolio;
}

export const fetchInitialStoreManagerPortfolio = cache(
  async (
    overrides: GetAnalyticsParams = {},
  ): Promise<InitialStoreManagerPortfolioPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) return null;

    const params: GetAnalyticsParams = {
      ...DEFAULT_ANALYTICS_PARAMS,
      ...overrides,
    };
    const period = params.period ?? "today";
    try {
      const data = normalizeStoreManagerPortfolio(
        await getStoreManagerPortfolio(
          session.email,
          session.storeId,
          period,
        ),
      );
      return { params: { period }, data };
    } catch (error) {
      console.error("[data.analytics] fetchInitialStoreManagerPortfolio failed", {
        period,
        error,
      });
      return null;
    }
  },
);

export const fetchInitialStoreAnalytics = cache(
  async (
    overrides: GetAnalyticsParams = {},
  ): Promise<InitialStoreAnalyticsPayload | null> => {
    const startedAt = Date.now();
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER"])) return null;

    const params: GetAnalyticsParams = {
      ...DEFAULT_ANALYTICS_PARAMS,
      ...overrides,
    };
    const period = params.period ?? "today";
    let storeId: string;
    try {
      storeId = await resolveAccessibleStoreId(session, params.storeId);
    } catch (error) {
      console.error("[data.analytics] fetchInitialStoreAnalytics access denied", {
        period,
        requestedStoreId: params.storeId,
        sessionStoreId: session.storeId,
        role: session.role,
        error,
      });
      return null;
    }
    try {
      const data = await getStoreAnalytics(storeId, period);

      return { params: { period, storeId }, data };
    } catch (error) {
      console.error("[data.analytics] fetchInitialStoreAnalytics failed", {
        period,
        storeId,
        elapsedMs: Date.now() - startedAt,
        error,
      });
      return null;
    }
  },
);

export const fetchInitialAdminOverview = cache(
  async (
    overrides: GetAnalyticsParams = {},
  ): Promise<InitialAdminOverviewPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return null;

    const params: GetAnalyticsParams = {
      ...DEFAULT_ANALYTICS_PARAMS,
      ...overrides,
    };
    const period = params.period ?? "today";
    try {
      const data = await getAdminDashboardOverview(period);
      return { params: { period }, data };
    } catch (error) {
      console.error("[data.analytics] fetchInitialAdminOverview failed", {
        period,
        error,
      });
      return null;
    }
  },
);

export const fetchInitialStoreOverviewBundle = cache(
  async (
    overrides: GetAnalyticsParams = {},
  ): Promise<InitialStoreOverviewBundlePayload | null> => {
    const startedAt = Date.now();
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return null;
    }

    const params: GetAnalyticsParams = {
      ...DEFAULT_ANALYTICS_PARAMS,
      ...overrides,
    };
    const period = params.period ?? "today";
    let storeId: string;
    try {
      if (session.role === "MASTER_ADMIN") {
        if (!params.storeId) return null;
        const exists = await assertStoreExists(params.storeId);
        if (!exists) return null;
        storeId = params.storeId;
      } else {
        storeId = await resolveAccessibleStoreId(session, params.storeId);
      }
    } catch (error) {
      console.error("[data.analytics] fetchInitialStoreOverviewBundle access denied", {
        period,
        requestedStoreId: params.storeId,
        sessionStoreId: "storeId" in session ? session.storeId : undefined,
        role: session.role,
        error,
      });
      return null;
    }

    try {
      const bundle =
        session.role === "MASTER_ADMIN"
          ? await getAdminStoreOverviewBundle(storeId, period)
          : await getStoreOverviewBundle(session, storeId, period);
      return { params: { period, storeId }, bundle };
    } catch (error) {
      console.error("[data.analytics] fetchInitialStoreOverviewBundle failed", {
        period,
        storeId,
        elapsedMs: Date.now() - startedAt,
        error,
      });
      return null;
    }
  },
);

export const fetchInitialAdminStoreDetail = cache(
  async (
    storeId: string,
    overrides: GetAnalyticsParams = {},
  ): Promise<InitialAdminStoreDetailPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return null;

    const params: GetAnalyticsParams = {
      ...DEFAULT_ANALYTICS_PARAMS,
      ...overrides,
    };
    const period = params.period ?? "today";
    const data = await getAdminStoreDetailAnalytics(storeId, period);

    return { storeId, params: { period }, data };
  },
);
