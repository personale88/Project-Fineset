import type { StoreManagerPortfolio, StorePerformanceRow } from "@/types";

/** True when SSR/cache rows include store manager fields (added after first deploy). */
export function storePerformanceRowHasManagerFields(
  row: StorePerformanceRow,
): boolean {
  return (
    Object.prototype.hasOwnProperty.call(row, "storeManagerName") &&
    Object.prototype.hasOwnProperty.call(row, "storeManagerPhone")
  );
}

export function portfolioHasStoreManagerFields(
  portfolio: StoreManagerPortfolio,
): boolean {
  return portfolio.stores.every(storePerformanceRowHasManagerFields);
}

/** Fills metrics added after first deploy so stale SSR/cache rows never render "undefined". */
export function normalizeStorePerformanceRow(
  row: StorePerformanceRow,
): StorePerformanceRow {
  return {
    ...row,
    storeManagerName: row.storeManagerName ?? null,
    storeManagerPhone: row.storeManagerPhone ?? null,
    fieldSales: row.fieldSales ?? 0,
    userCalls: row.userCalls ?? 0,
    avgTicketSize: row.avgTicketSize ?? 0,
    schemesEnrolled: row.schemesEnrolled ?? 0,
    deltas: row.deltas
      ? {
          visits: row.deltas.visits ?? 0,
          revenue: row.deltas.revenue ?? 0,
          conversionRate: row.deltas.conversionRate ?? 0,
          avgTicketSize: row.deltas.avgTicketSize ?? 0,
          schemesEnrolled: row.deltas.schemesEnrolled ?? 0,
          fieldSales: row.deltas.fieldSales ?? 0,
          userCalls: row.deltas.userCalls ?? 0,
        }
      : undefined,
  };
}

export function normalizeStoreManagerPortfolio(
  portfolio: StoreManagerPortfolio,
): StoreManagerPortfolio {
  return {
    ...portfolio,
    stores: portfolio.stores.map(normalizeStorePerformanceRow),
  };
}
