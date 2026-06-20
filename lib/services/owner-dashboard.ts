import { prisma } from "@/lib/db/prisma";
import {
  getManagerStaffActivity,
  type ManagerStaffActivityRow,
} from "@/lib/services/manager-dashboard";
import type { AnalyticsPeriodLabel } from "@/types";

export interface OwnerStaffActivityRow extends ManagerStaffActivityRow {
  storeId: string;
  storeName: string;
}

export interface OwnerDashboardOverview {
  staffActivity: OwnerStaffActivityRow[];
}

function sortStaffActivity(
  rows: OwnerStaffActivityRow[],
): OwnerStaffActivityRow[] {
  return [...rows].sort((a, b) => {
    if (b.pendingWork !== a.pendingWork) return b.pendingWork - a.pendingWork;
    if (b.overdueTasks !== a.overdueTasks) return b.overdueTasks - a.overdueTasks;
    if (a.storeName !== b.storeName) return a.storeName.localeCompare(b.storeName);
    return a.staffName.localeCompare(b.staffName);
  });
}

export async function getOwnerDashboardOverview(
  storeIds: string[],
  period?: AnalyticsPeriodLabel,
): Promise<OwnerDashboardOverview> {
  if (storeIds.length === 0) {
    return { staffActivity: [] };
  }

  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });
  const storeNameById = new Map(stores.map((store) => [store.id, store.name]));

  const perStore = await Promise.all(
    storeIds.map(async (storeId) => {
      const staffActivity = await getManagerStaffActivity(storeId, period);

      return {
        storeId,
        storeName: storeNameById.get(storeId) ?? "Store",
        staffActivity,
      };
    }),
  );

  return {
    staffActivity: sortStaffActivity(
      perStore.flatMap(({ storeId, storeName, staffActivity: rows }) =>
        rows.map((row) => ({ ...row, storeId, storeName })),
      ),
    ),
  };
}
