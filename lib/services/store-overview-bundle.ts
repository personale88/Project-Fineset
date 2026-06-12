import { assertStoreExists, getStoreAnalytics } from "@/lib/services/analytics";
import { mergeStoreWhere } from "@/lib/db/store-scope";
import { prisma } from "@/lib/db/prisma";
import { listAccessibleStores } from "@/lib/services/manager-stores";
import { getStoreCallAnalytics } from "@/lib/services/store-call-analytics";
import { getStoreFieldSaleAnalytics } from "@/lib/services/store-field-sale-analytics";
import { getStoreRsoPerformance } from "@/lib/services/rso-performance";
import type {
  AnalyticsData,
  AnalyticsPeriod,
  MyStoresResponse,
  StoreCallAnalytics,
  StoreFieldSaleAnalytics,
  StorePortalSession,
  StoreRsoPerformance,
} from "@/types";

export interface StoreOverviewBundle {
  myStores: MyStoresResponse;
  kpis: AnalyticsData;
  calls: StoreCallAnalytics;
  fieldSales: StoreFieldSaleAnalytics;
  rsoPerformance: StoreRsoPerformance;
}

export async function getAdminStoreOverviewBundle(
  storeId: string,
  period: AnalyticsPeriod["label"],
): Promise<StoreOverviewBundle> {
  const store = await prisma.store.findFirst({
    where: mergeStoreWhere({ id: storeId }),
    select: { id: true, name: true, city: true, state: true },
  });

  if (!store) {
    throw new Error("Store not found");
  }

  const [kpis, calls, fieldSales, rsoPerformance] = await Promise.all([
    getStoreAnalytics(storeId, period),
    getStoreCallAnalytics(storeId, period),
    getStoreFieldSaleAnalytics(storeId, period),
    getStoreRsoPerformance(storeId, period),
  ]);

  return {
    myStores: {
      data: [store],
      selectedStoreId: storeId,
    },
    kpis,
    calls,
    fieldSales,
    rsoPerformance,
  };
}

export async function getStoreOverviewBundle(
  session: StorePortalSession,
  storeId: string,
  period: AnalyticsPeriod["label"],
): Promise<StoreOverviewBundle> {
  const [stores, kpis, calls, fieldSales, rsoPerformance] = await Promise.all([
    listAccessibleStores(session),
    getStoreAnalytics(storeId, period),
    getStoreCallAnalytics(storeId, period),
    getStoreFieldSaleAnalytics(storeId, period),
    getStoreRsoPerformance(storeId, period),
  ]);

  return {
    myStores: {
      data: stores,
      selectedStoreId: storeId,
    },
    kpis,
    calls,
    fieldSales,
    rsoPerformance,
  };
}
