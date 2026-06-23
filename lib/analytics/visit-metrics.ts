import type { PurchaseStatus } from "@prisma/client";

export function visitRevenue(visit: {
  purchaseStatus: PurchaseStatus;
  transactionAmount: number | null;
}): number {
  if (visit.purchaseStatus !== "PURCHASED") return 0;
  return visit.transactionAmount ?? 0;
}

export function isPurchasedVisit(visit: { purchaseStatus: PurchaseStatus }): boolean {
  return visit.purchaseStatus === "PURCHASED";
}
