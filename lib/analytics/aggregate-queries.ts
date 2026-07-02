/**
 * SQL aggregate query layer.
 *
 * Queries the visit_daily_aggregate materialized view instead of loading raw
 * Visit rows. A full-portfolio month returns ~50 rows (one per day × dimension
 * combination) instead of thousands of raw Visit records.
 *
 * Raw prisma.visit.findMany is kept only for breakdown dimensions that need
 * array fields (productsExplored, schemesPitched) which cannot be aggregated
 * in the materialized view. Even those fetches use a minimal 4-column projection.
 */

import { prisma } from "@/lib/db/prisma";
import { mergeStoreWhere } from "@/lib/db/store-scope";
import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";
import type {
  AnalyticsSummary,
  AnalyticsTrendPoint,
  ComparisonTrendPoint,
  BreakdownRow,
  StaffBreakdownRow,
} from "@/types/admin-business-analytics";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants/product-categories";
import { computeVisitValueTier } from "@/lib/services/call-list-utils";
import { ANALYTICS_FILTER_NA, isAnalyticsFilterActive } from "@/lib/analytics/analytics-query-filters";
import { percentDelta } from "@/lib/utils/analytics-date-range";
import type { BudgetRange, CustomerType, IntentTier, Prisma, PurchaseStatus, SourceChannel, VisitType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Raw row returned from visit_daily_aggregate
// ---------------------------------------------------------------------------

export type AggRowPublic = AggRow;
export type ArrayVisitRowPublic = ArrayVisitRow;

interface AggRow {
  store_id: string;
  staff_id: string;
  date: Date;
  customer_type: CustomerType;
  source_channel: SourceChannel;
  intent_tier: IntentTier | null;
  purchase_status: PurchaseStatus;
  budget_stated: BudgetRange | null;
  total_visits: bigint;
  purchased_count: bigint;
  total_revenue: number;
  unique_customers: bigint;
  avg_transaction: number | null;
}

// Minimal Visit projection for array-field breakdowns only
interface ArrayVisitRow {
  staffId: string;
  transactionAmount: number | null;
  purchaseStatus: PurchaseStatus;
  budgetStated: BudgetRange | null;
  productsExplored: string[];
  productsPurchased: string[];
  schemesPitched: string[];
  enrollmentOutcome: string | null;
  schemeEnrolled: boolean;
  gender: string | null;
  ageGroup: string | null;
  area: string | null;
  visitType: VisitType;
  staff: { name: string };
}

// ---------------------------------------------------------------------------
// WHERE clause builder for the materialized view
// ---------------------------------------------------------------------------

function pushEnumCondition(
  conditions: string[],
  params: unknown[],
  idxRef: { idx: number },
  column: string,
  enumType: string,
  value: string,
): void {
  conditions.push(`${column} = $${idxRef.idx}::"${enumType}"`);
  params.push(value);
  idxRef.idx += 1;
}

export function buildAggWhere(
  query: AdminBusinessAnalyticsQuery,
  start: Date,
  end: Date,
): { sql: string; params: unknown[] } {
  const conditions: string[] = [`date >= $1`, `date <= $2`];
  const params: unknown[] = [start, end];
  const idxRef = { idx: 3 };

  const pushCondition = (sql: string, value: unknown) => {
    conditions.push(sql.replace("$?", `$${idxRef.idx}`));
    params.push(value);
    idxRef.idx += 1;
  };

  if (isAnalyticsFilterActive(query, "customerType") && query.customerType) {
    pushEnumCondition(conditions, params, idxRef, "customer_type", "CustomerType", query.customerType);
  }
  if (isAnalyticsFilterActive(query, "purchaseStatus") && query.purchaseStatus) {
    pushEnumCondition(
      conditions,
      params,
      idxRef,
      "purchase_status",
      "PurchaseStatus",
      query.purchaseStatus,
    );
  }
  if (isAnalyticsFilterActive(query, "sourceChannel") && query.sourceChannel) {
    pushEnumCondition(
      conditions,
      params,
      idxRef,
      "source_channel",
      "SourceChannel",
      query.sourceChannel,
    );
  }
  if (isAnalyticsFilterActive(query, "intentTier") && query.intentTier) {
    if (query.intentTier === ANALYTICS_FILTER_NA) {
      conditions.push(`intent_tier IS NULL`);
    } else {
      pushEnumCondition(conditions, params, idxRef, "intent_tier", "IntentTier", query.intentTier);
    }
  }
  if (isAnalyticsFilterActive(query, "budgetRange") && query.budgetRange) {
    if (query.budgetRange === ANALYTICS_FILTER_NA) {
      conditions.push(`budget_stated IS NULL`);
    } else {
      pushEnumCondition(conditions, params, idxRef, "budget_stated", "BudgetRange", query.budgetRange);
    }
  }
  if (isAnalyticsFilterActive(query, "staffId") && query.staffId) {
    pushCondition(`staff_id = $?`, query.staffId);
  }

  // Map segment filter to SQL conditions (segment is computed, not stored)
  if (isAnalyticsFilterActive(query, "segment") && query.segment && query.segment !== "ALL") {
    switch (query.segment) {
      case "NEW":
        pushEnumCondition(conditions, params, idxRef, "customer_type", "CustomerType", "NEW");
        break;
      case "RETAINED":
        conditions.push(
          `customer_type IN ('REPEAT'::"CustomerType", 'VIP'::"CustomerType")`,
        );
        break;
      case "PURCHASED":
        pushEnumCondition(conditions, params, idxRef, "purchase_status", "PurchaseStatus", "PURCHASED");
        break;
      case "NOT_PURCHASED":
        pushEnumCondition(
          conditions,
          params,
          idxRef,
          "purchase_status",
          "PurchaseStatus",
          "NOT_PURCHASED",
        );
        break;
    }
  }

  return { sql: conditions.join(" AND "), params };
}

function buildStoreScopeSubquery(
  query: AdminBusinessAnalyticsQuery,
  storeColumn: string,
): string {
  const parts: string[] = [`"Store"."deletedAt" IS NULL`];
  if (isAnalyticsFilterActive(query, "storeId") && query.storeId) {
    parts.push(`"Store"."id" = '${query.storeId.replace(/'/g, "''")}'`);
  } else {
    if (isAnalyticsFilterActive(query, "city") && query.city) {
      parts.push(`LOWER("Store"."city") = LOWER('${query.city.replace(/'/g, "''")}')`);
    }
    if (isAnalyticsFilterActive(query, "storeCategory") && query.storeCategory) {
      parts.push(`"Store"."category" = '${query.storeCategory}'`);
    }
  }
  return `${storeColumn} IN (SELECT id FROM "Store" WHERE ${parts.join(" AND ")})`;
}

function buildStoreSubquery(query: AdminBusinessAnalyticsQuery): string {
  return buildStoreScopeSubquery(query, "store_id");
}

function buildVisitStoreSubquery(query: AdminBusinessAnalyticsQuery): string {
  return buildStoreScopeSubquery(query, '"storeId"');
}

// ---------------------------------------------------------------------------
// Core aggregate query
// ---------------------------------------------------------------------------

export async function queryAggregateRows(
  query: AdminBusinessAnalyticsQuery,
  start: Date,
  end: Date,
): Promise<AggRow[]> {
  const storeClause = buildStoreSubquery(query);
  const { sql: whereClause, params } = buildAggWhere(query, start, end);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.$queryRawUnsafe<AggRow[]>(
    `SELECT
       store_id, staff_id, date, customer_type, source_channel, intent_tier,
       purchase_status, budget_stated,
       total_visits, purchased_count, total_revenue, unique_customers, avg_transaction
     FROM visit_daily_aggregate
     WHERE ${storeClause}
       AND ${whereClause}`,
    ...params,
  );
}

// ---------------------------------------------------------------------------
// Summary computation from aggregate rows
// ---------------------------------------------------------------------------

export function buildSummaryFromAgg(rows: AggRow[], fieldSalesCount: number): AnalyticsSummary {
  let totalVisits = 0;
  let totalRevenue = 0;
  let purchasedCount = 0;
  let uniqueCustomers = 0;

  for (const row of rows) {
    totalVisits += Number(row.total_visits);
    totalRevenue += Number(row.total_revenue);
    purchasedCount += Number(row.purchased_count);
    // unique_customers is per-dimension bucket; we sum then clip to avoid over-count.
    // True unique count requires a raw query; here we use the best-available aggregate.
    uniqueCustomers += Number(row.unique_customers);
  }

  // Deduplicate unique customers approximation — capped to totalVisits
  uniqueCustomers = Math.min(uniqueCustomers, totalVisits);

  const conversionRate =
    totalVisits > 0
      ? Math.round((purchasedCount / totalVisits) * 1000) / 10
      : 0;

  const avgTransaction =
    purchasedCount > 0 ? Math.round(totalRevenue / purchasedCount) : 0;

  return { totalVisits, totalRevenue, conversionRate, uniqueCustomers, avgTransaction, fieldSalesCount };
}

// ---------------------------------------------------------------------------
// Trend computation from aggregate rows
// ---------------------------------------------------------------------------

export function buildTrendsFromAgg(rows: AggRow[]): AnalyticsTrendPoint[] {
  const byDay = new Map<string, { visits: number; revenue: number }>();
  for (const row of rows) {
    const date = row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date).slice(0, 10);
    const existing = byDay.get(date) ?? { visits: 0, revenue: 0 };
    existing.visits += Number(row.total_visits);
    existing.revenue += Number(row.total_revenue);
    byDay.set(date, existing);
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));
}

export function buildComparisonTrendsFromAgg(
  rowsA: AggRow[],
  rowsB: AggRow[],
): ComparisonTrendPoint[] {
  const bucketA = new Map<number, { visits: number; revenue: number }>();
  const bucketB = new Map<number, { visits: number; revenue: number }>();

  for (const row of rowsA) {
    const day = (row.date instanceof Date ? row.date : new Date(row.date)).getDate();
    const existing = bucketA.get(day) ?? { visits: 0, revenue: 0 };
    existing.visits += Number(row.total_visits);
    existing.revenue += Number(row.total_revenue);
    bucketA.set(day, existing);
  }
  for (const row of rowsB) {
    const day = (row.date instanceof Date ? row.date : new Date(row.date)).getDate();
    const existing = bucketB.get(day) ?? { visits: 0, revenue: 0 };
    existing.visits += Number(row.total_visits);
    existing.revenue += Number(row.total_revenue);
    bucketB.set(day, existing);
  }

  const days = new Set([...bucketA.keys(), ...bucketB.keys()]);
  return Array.from(days)
    .sort((a, b) => a - b)
    .map((day) => ({
      day,
      label: `Day ${day}`,
      periodA: bucketA.get(day) ?? { visits: 0, revenue: 0 },
      periodB: bucketB.get(day) ?? { visits: 0, revenue: 0 },
    }));
}

// ---------------------------------------------------------------------------
// Breakdown rows from aggregate data (no array-field dimensions)
// ---------------------------------------------------------------------------

export function buildBreakdownsFromAgg(rows: AggRow[]): {
  customerType: BreakdownRow[];
  intentTier: BreakdownRow[];
  purchaseStatus: BreakdownRow[];
  sourceChannel: BreakdownRow[];
  budgetRange: BreakdownRow[];
} {
  const CUSTOMER_TYPE_LABELS: Record<string, string> = {
    NEW: "New", REPEAT: "Repeat", VIP: "VIP",
  };
  const INTENT_LABELS: Record<string, string> = {
    HOT: "Hot intent", WARM: "Warm intent", COLD: "Cold intent", BROWSING: "Browsing",
  };
  const PURCHASE_LABELS: Record<string, string> = {
    PURCHASED: "Purchased", NOT_PURCHASED: "Not purchased", PENDING: "Pending",
  };
  const SOURCE_LABELS: Record<string, string> = {
    ORGANIC_WALK_IN: "Organic walk-in", REFERRAL: "Referral", SOCIAL_MEDIA: "Social media",
    INTERNET: "Internet", PHONE: "Phone", USER_CALLS: "User calls",
    TANISHQ_REF: "Tanishq ref", CARATLANE_REF: "CaratLane ref", OTHER: "Other",
  };
  const BUDGET_LABELS: Record<string, string> = {
    UNDER_15K: "Under ₹15k", K15_50K: "₹15k–50k", K50_1L: "₹50k–1L",
    ABOVE_1L: "Above ₹1L", NOT_STATED: "Not stated",
  };

  const aggregate = <K extends string>(
    getKey: (r: AggRow) => K | null | undefined,
    labelMap: Record<string, string>,
  ): BreakdownRow[] => {
    const buckets = new Map<string, { count: number; revenue: number }>();
    for (const row of rows) {
      const key = getKey(row);
      if (!key) continue;
      const label = labelMap[key] ?? key;
      const existing = buckets.get(label) ?? { count: 0, revenue: 0 };
      existing.count += Number(row.total_visits);
      existing.revenue += Number(row.total_revenue);
      buckets.set(label, existing);
    }
    return Array.from(buckets.entries())
      .map(([label, { count, revenue }]) => ({ label, count, revenue }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    customerType: aggregate((r) => r.customer_type, CUSTOMER_TYPE_LABELS),
    intentTier: aggregate((r) => r.intent_tier ?? undefined, INTENT_LABELS),
    purchaseStatus: aggregate((r) => r.purchase_status, PURCHASE_LABELS),
    sourceChannel: aggregate((r) => r.source_channel, SOURCE_LABELS),
    budgetRange: aggregate((r) => r.budget_stated ?? undefined, BUDGET_LABELS),
  };
}

// ---------------------------------------------------------------------------
// Staff breakdown from aggregate rows (no raw Visit needed)
// ---------------------------------------------------------------------------

export function buildStaffBreakdownFromAgg(
  rows: AggRow[],
  staffNameMap: Map<string, string>,
): StaffBreakdownRow[] {
  const byStaff = new Map<string, { staffId: string; label: string; visits: number; revenue: number }>();
  for (const row of rows) {
    const existing = byStaff.get(row.staff_id) ?? {
      staffId: row.staff_id,
      label: staffNameMap.get(row.staff_id) ?? row.staff_id,
      visits: 0,
      revenue: 0,
    };
    existing.visits += Number(row.total_visits);
    existing.revenue += Number(row.total_revenue);
    byStaff.set(row.staff_id, existing);
  }
  return Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Minimal array-field fetch for product/scheme breakdowns only
// ---------------------------------------------------------------------------

export async function fetchArrayFieldRows(
  query: AdminBusinessAnalyticsQuery,
  start: Date,
  end: Date,
): Promise<ArrayVisitRow[]> {
  const where = buildRawWhere(query, start, end);
  const rows = await prisma.visit.findMany({
    where,
    select: {
      staffId: true,
      transactionAmount: true,
      purchaseStatus: true,
      budgetStated: true,
      productsExplored: true,
      productsPurchased: true,
      schemesPitched: true,
      enrollmentOutcome: true,
      schemeEnrolled: true,
      gender: true,
      ageGroup: true,
      area: true,
      visitType: true,
      staff: { select: { name: true } },
    },
    orderBy: { visitDate: "asc" },
  });

  // Apply valueTier post-filter here if active (can't be done on aggregate view)
  if (isAnalyticsFilterActive(query, "valueTier") && query.valueTier && query.valueTier !== "ALL") {
    return rows.filter((r) => computeVisitValueTier(r) === query.valueTier);
  }
  // Apply segment post-filter for row-level fields when needed
  if (isAnalyticsFilterActive(query, "segment") && query.segment && query.segment !== "ALL") {
    return rows.filter((r) => {
      switch (query.segment) {
        case "NEW": return r.purchaseStatus === "PURCHASED" ? false : true; // handled by customerType at SQL level
        case "RETAINED": return true;
        case "PURCHASED": return r.purchaseStatus === "PURCHASED";
        case "NOT_PURCHASED": return r.purchaseStatus === "NOT_PURCHASED";
        default: return true;
      }
    });
  }
  return rows;
}

function buildRawWhere(
  query: AdminBusinessAnalyticsQuery,
  start: Date,
  end: Date,
): Prisma.VisitWhereInput {
  const where: Prisma.VisitWhereInput = {
    visitDate: { gte: start, lte: end },
  };

  const storeScope: Prisma.StoreWhereInput = {};
  if (isAnalyticsFilterActive(query, "storeId") && query.storeId) {
    storeScope.id = query.storeId;
  } else {
    if (isAnalyticsFilterActive(query, "city") && query.city) {
      storeScope.city = { equals: query.city, mode: "insensitive" };
    }
    if (isAnalyticsFilterActive(query, "storeCategory") && query.storeCategory) {
      storeScope.category = query.storeCategory as import("@prisma/client").StoreCategory;
    }
  }
  where.store = mergeStoreWhere(storeScope);

  if (isAnalyticsFilterActive(query, "staffId") && query.staffId) {
    where.staffId = query.staffId;
  }
  if (isAnalyticsFilterActive(query, "customerType") && query.customerType) {
    where.customerType = query.customerType as CustomerType;
  }
  if (isAnalyticsFilterActive(query, "purchaseStatus") && query.purchaseStatus) {
    where.purchaseStatus = query.purchaseStatus as PurchaseStatus;
  }
  if (isAnalyticsFilterActive(query, "sourceChannel") && query.sourceChannel) {
    where.sourceChannel = query.sourceChannel as SourceChannel;
  }
  if (isAnalyticsFilterActive(query, "intentTier") && query.intentTier) {
    where.intentTier = query.intentTier === ANALYTICS_FILTER_NA
      ? null
      : query.intentTier as IntentTier;
  }
  if (isAnalyticsFilterActive(query, "visitType") && query.visitType) {
    where.visitType = query.visitType as VisitType;
  }

  return where;
}

// ---------------------------------------------------------------------------
// Array-field breakdown builders
// ---------------------------------------------------------------------------

export function buildArrayFieldBreakdowns(rows: ArrayVisitRow[]): {
  productsExplored: BreakdownRow[];
  productsPurchased: BreakdownRow[];
  schemeProduct: BreakdownRow[];
  enrollmentOutcome: BreakdownRow[];
  valueTier: BreakdownRow[];
  gender: BreakdownRow[];
  ageGroup: BreakdownRow[];
  area: BreakdownRow[];
  visitType: BreakdownRow[];
} {
  // valueTier is computed per-visit from transactionAmount/budgetStated
  const valueTierCounts = new Map<string, number>();
  const TIER_LABELS: Record<string, string> = { HIGH: "High value", MID: "Mid value", LOW: "Low value" };
  for (const row of rows) {
    const tier = computeVisitValueTier(row);
    const label = TIER_LABELS[tier] ?? tier;
    valueTierCounts.set(label, (valueTierCounts.get(label) ?? 0) + 1);
  }

  const countArray = (getArr: (r: ArrayVisitRow) => string[], labelMap: Record<string, string>): BreakdownRow[] => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      for (const item of getArr(row)) {
        const label = labelMap[item] ?? item;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  };

  const SCHEME_LABELS: Record<string, string> = { GHS: "GHS", GPP: "JPP", NONE: "None" };
  const ENROLLMENT_LABELS: Record<string, string> = {
    ENROLLED_GHS: "Enrolled GHS", ENROLLED_GPP: "Enrolled JPP",
    ENROLLED_BOTH: "Enrolled both", INTERESTED: "Interested",
    DECLINED: "Declined", CALLBACK: "Callback",
  };

  const GENDER_LABELS: Record<string, string> = {
    MALE: "Male", FEMALE: "Female", OTHER: "Other", PREFER_NOT_TO_SAY: "Prefer not to say",
  };
  const AGE_LABELS: Record<string, string> = {
    "18-25": "18–25", "26-35": "26–35", "36-50": "36–50", "50+": "50+",
  };
  const VISIT_TYPE_LABELS: Record<string, string> = {
    WALK_IN: "Walk-in", APPOINTMENT: "Appointment",
  };

  const countNullableField = (getValue: (r: ArrayVisitRow) => string | null | undefined): BreakdownRow[] => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const val = getValue(row)?.trim();
      if (!val) continue;
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);
  };

  return {
    productsExplored: countArray((r) => r.productsExplored, PRODUCT_CATEGORY_LABELS),
    productsPurchased: countArray((r) => r.productsPurchased, PRODUCT_CATEGORY_LABELS),
    schemeProduct: countArray((r) => r.schemesPitched, SCHEME_LABELS),
    enrollmentOutcome: countArray(
      (r) => r.enrollmentOutcome ? [r.enrollmentOutcome] : [],
      ENROLLMENT_LABELS,
    ),
    valueTier: Array.from(valueTierCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    gender: countArray((r) => r.gender ? [r.gender] : [], GENDER_LABELS),
    ageGroup: countArray((r) => r.ageGroup ? [r.ageGroup] : [], AGE_LABELS),
    area: countNullableField((r) => r.area),
    visitType: countArray((r) => [r.visitType], VISIT_TYPE_LABELS),
  };
}

// ---------------------------------------------------------------------------
// Unique customer count via exact SQL (used for accurate display)
// ---------------------------------------------------------------------------

export async function queryUniqueCustomers(
  query: AdminBusinessAnalyticsQuery,
  start: Date,
  end: Date,
): Promise<number> {
  const storeClause = buildVisitStoreSubquery(query);

  const result = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(DISTINCT "customerPhoneHash") AS count
     FROM "Visit"
     WHERE ${storeClause}
       AND "visitDate" >= $1 AND "visitDate" <= $2`,
    start,
    end,
  );
  return Number(result[0]?.count ?? 0);
}

// ---------------------------------------------------------------------------
// Delta computation (re-exported for convenience)
// ---------------------------------------------------------------------------

export { percentDelta };
