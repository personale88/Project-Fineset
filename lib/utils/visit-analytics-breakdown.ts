import type { PurchaseStatus } from "@prisma/client";

const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PURCHASED: "Purchased",
  NOT_PURCHASED: "Not purchased",
  PENDING: "Pending",
};

export interface VisitPurchaseStatusCount {
  status: PurchaseStatus;
  count: number;
}

export interface VisitPurchaseStatusLabelRow {
  label: string;
  count: number;
  status: PurchaseStatus;
}

export function buildVisitPurchaseStatusBreakdown(
  visits: Array<{ purchaseStatus: PurchaseStatus }>,
): VisitPurchaseStatusCount[] {
  const map = new Map<PurchaseStatus, number>();

  for (const visit of visits) {
    map.set(visit.purchaseStatus, (map.get(visit.purchaseStatus) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

export function toVisitPurchaseStatusLabelRows(
  breakdown: VisitPurchaseStatusCount[],
): VisitPurchaseStatusLabelRow[] {
  const order: PurchaseStatus[] = ["PURCHASED", "NOT_PURCHASED", "PENDING"];

  return order
    .filter((status) => breakdown.some((row) => row.status === status))
    .map((status) => {
      const count = breakdown.find((row) => row.status === status)?.count ?? 0;
      return {
        status,
        count,
        label: PURCHASE_STATUS_LABELS[status],
      };
    });
}

export function countVisitPurchaseStatus(
  breakdown: VisitPurchaseStatusCount[] | undefined,
  status: PurchaseStatus,
): number {
  return breakdown?.find((row) => row.status === status)?.count ?? 0;
}
