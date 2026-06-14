import { cache } from "react";
import { getServerSession, requireRole } from "@/lib/auth/session";
import { resolveAccessibleStoreId } from "@/lib/services/manager-stores";
import { getStaffPerformance, listStaff } from "@/lib/services/staff";
import { listStores } from "@/lib/services/stores";
import type { PaginatedResponse, StaffPerformanceRow, StoreCategory } from "@/types";
import { DEFAULT_STORES_FILTER_PARAMS } from "@/lib/query/initial-data";

export interface InitialStoreStaffPayload {
  data: Awaited<ReturnType<typeof listStaff>>;
  storeId: string;
}

export interface InitialStaffPerformancePayload {
  storeFilter: string;
  data: StaffPerformanceRow[];
}

export interface InitialStaffFilterStoresPayload {
  data: PaginatedResponse<{
    id: string;
    name: string;
    category: StoreCategory;
    customCategory: string | null;
    city: string;
    state: string;
    pincode: string | null;
    businessOwnerName: string | null;
    businessOwnerEmail: string | null;
    isActive: boolean;
    staffCount: number;
    visits: number;
    createdAt: string;
  }>;
}

export const fetchInitialStoreStaff = cache(
  async (storeIdOverride?: string): Promise<InitialStoreStaffPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER"])) return null;

    const storeId = await resolveAccessibleStoreId(
      session,
      storeIdOverride,
    );
    const data = await listStaff(storeId);
    return { data, storeId };
  },
);

export const fetchInitialStaffPerformance = cache(
  async (storeId?: string): Promise<InitialStaffPerformancePayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return null;

    const storeFilter = storeId ?? "all";
    const data = await getStaffPerformance(
      storeFilter === "all" ? undefined : storeFilter,
    );

    return { storeFilter, data };
  },
);

export const fetchInitialStaffFilterStores = cache(
  async (): Promise<InitialStaffFilterStoresPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return null;

    const data = await listStores(DEFAULT_STORES_FILTER_PARAMS);
    return {
      data: {
        data: data.data,
        total: data.total,
        page: DEFAULT_STORES_FILTER_PARAMS.page,
        pageSize: DEFAULT_STORES_FILTER_PARAMS.pageSize,
      },
    };
  },
);
