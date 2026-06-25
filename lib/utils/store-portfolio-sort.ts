import type { StorePerformanceRow } from "@/types";

export type StorePortfolioSortKey =
  | "nameAsc"
  | "nameDesc"
  | "revenueDesc"
  | "revenueAsc"
  | "visitsDesc"
  | "visitsAsc"
  | "conversionDesc"
  | "conversionAsc"
  | "avgTicketDesc"
  | "avgTicketAsc"
  | "schemesDesc"
  | "schemesAsc"
  | "fieldSalesDesc"
  | "fieldSalesAsc"
  | "userCallsDesc"
  | "userCallsAsc"
  | "staffDesc"
  | "staffAsc"
  | "cityAsc"
  | "cityDesc"
  | "activeFirst"
  | "inactiveFirst"
  | "revenueDeltaDesc"
  | "revenueDeltaAsc"
  | "visitsDeltaDesc"
  | "visitsDeltaAsc";

export const DEFAULT_STORE_PORTFOLIO_SORT: StorePortfolioSortKey = "nameAsc";

/** Sort options shown in the Your Stores dropdown (keep to 4 max). */
export const STORE_PORTFOLIO_SORT_KEYS: StorePortfolioSortKey[] = [
  "nameAsc",
  "revenueDesc",
  "visitsDesc",
  "conversionDesc",
];

function compareName(a: StorePerformanceRow, b: StorePerformanceRow): number {
  return a.storeName.localeCompare(b.storeName, undefined, { sensitivity: "base" });
}

function compareCity(a: StorePerformanceRow, b: StorePerformanceRow): number {
  const aLocation = `${a.city}, ${a.state}`;
  const bLocation = `${b.city}, ${b.state}`;
  const byCity = aLocation.localeCompare(bLocation, undefined, { sensitivity: "base" });
  if (byCity !== 0) return byCity;
  return compareName(a, b);
}

function compareNumeric(
  a: StorePerformanceRow,
  b: StorePerformanceRow,
  pick: (row: StorePerformanceRow) => number,
  direction: "asc" | "desc",
): number {
  const delta = pick(a) - pick(b);
  if (delta !== 0) return direction === "desc" ? -delta : delta;
  return compareName(a, b);
}

function compareDelta(
  a: StorePerformanceRow,
  b: StorePerformanceRow,
  pick: (row: StorePerformanceRow) => number | undefined,
  direction: "asc" | "desc",
): number {
  const aDelta = pick(a) ?? 0;
  const bDelta = pick(b) ?? 0;
  const delta = aDelta - bDelta;
  if (delta !== 0) return direction === "desc" ? -delta : delta;
  return compareName(a, b);
}

function compareActive(
  a: StorePerformanceRow,
  b: StorePerformanceRow,
  activeFirst: boolean,
): number {
  if (a.isActive !== b.isActive) {
    if (activeFirst) return a.isActive ? -1 : 1;
    return a.isActive ? 1 : -1;
  }
  return compareName(a, b);
}

export function sortStorePerformanceRows(
  rows: StorePerformanceRow[],
  sortKey: StorePortfolioSortKey,
): StorePerformanceRow[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    switch (sortKey) {
      case "nameAsc":
        return compareName(a, b);
      case "nameDesc":
        return compareName(b, a);
      case "revenueDesc":
        return compareNumeric(a, b, (row) => row.revenue, "desc");
      case "revenueAsc":
        return compareNumeric(a, b, (row) => row.revenue, "asc");
      case "visitsDesc":
        return compareNumeric(a, b, (row) => row.visits, "desc");
      case "visitsAsc":
        return compareNumeric(a, b, (row) => row.visits, "asc");
      case "conversionDesc":
        return compareNumeric(a, b, (row) => row.conversionRate, "desc");
      case "conversionAsc":
        return compareNumeric(a, b, (row) => row.conversionRate, "asc");
      case "avgTicketDesc":
        return compareNumeric(a, b, (row) => row.avgTicketSize, "desc");
      case "avgTicketAsc":
        return compareNumeric(a, b, (row) => row.avgTicketSize, "asc");
      case "schemesDesc":
        return compareNumeric(a, b, (row) => row.schemesEnrolled, "desc");
      case "schemesAsc":
        return compareNumeric(a, b, (row) => row.schemesEnrolled, "asc");
      case "fieldSalesDesc":
        return compareNumeric(a, b, (row) => row.fieldSales ?? 0, "desc");
      case "fieldSalesAsc":
        return compareNumeric(a, b, (row) => row.fieldSales ?? 0, "asc");
      case "userCallsDesc":
        return compareNumeric(a, b, (row) => row.userCalls ?? 0, "desc");
      case "userCallsAsc":
        return compareNumeric(a, b, (row) => row.userCalls ?? 0, "asc");
      case "staffDesc":
        return compareNumeric(a, b, (row) => row.staffCount, "desc");
      case "staffAsc":
        return compareNumeric(a, b, (row) => row.staffCount, "asc");
      case "cityAsc":
        return compareCity(a, b);
      case "cityDesc":
        return compareCity(b, a);
      case "activeFirst":
        return compareActive(a, b, true);
      case "inactiveFirst":
        return compareActive(a, b, false);
      case "revenueDeltaDesc":
        return compareDelta(a, b, (row) => row.deltas?.revenue, "desc");
      case "revenueDeltaAsc":
        return compareDelta(a, b, (row) => row.deltas?.revenue, "asc");
      case "visitsDeltaDesc":
        return compareDelta(a, b, (row) => row.deltas?.visits, "desc");
      case "visitsDeltaAsc":
        return compareDelta(a, b, (row) => row.deltas?.visits, "asc");
      default:
        return compareName(a, b);
    }
  });
  return sorted;
}
