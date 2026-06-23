import { mergeStoreWhere } from "@/lib/db/store-scope";
import { visitRevenue } from "@/lib/analytics/visit-metrics";
import { getStoreCategoryLabel } from "@/lib/utils/store-category";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/constants/product-categories";
import { prisma } from "@/lib/db/prisma";
import {
  queryAggregateRows,
  fetchArrayFieldRows,
  buildSummaryFromAgg,
  buildTrendsFromAgg,
  buildComparisonTrendsFromAgg,
  buildBreakdownsFromAgg,
  buildArrayFieldBreakdowns,
  buildStaffBreakdownFromAgg,
} from "@/lib/analytics/aggregate-queries";
import type {
  AggRowPublic,
  ArrayVisitRowPublic,
} from "@/lib/analytics/aggregate-queries";
import {
  getCachedSummary,
  setCachedSummary,
  getCachedFilterOptions,
  setCachedFilterOptions,
  buildVersionedQueryKey,
  hashQueryKey,
} from "@/lib/cache/analytics-cache";
import {
  computeVisitValueTier,
  matchesCallSegment,
  matchesCallValueTier,
} from "@/lib/services/call-list-utils";
import {
  calculateConversionRate,
  calculateTotalRevenue,
} from "@/lib/utils/analytics";
import {
  percentDelta,
  resolveAnalyticsDates,
  type ResolvedDateRange,
} from "@/lib/utils/analytics-date-range";
import {
  ANALYTICS_FILTER_NA,
  isAnalyticsFilterActive,
  type AnalyticsFilterKey,
} from "@/lib/analytics/analytics-query-filters";
import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";
import type {
  AdminBusinessAnalytics,
  AdminBusinessAnalyticsFilterOptions,
  AnalyticsAppliedFilter,
  AnalyticsSummary,
  AnalyticsTrendPoint,
  BreakdownRow,
  ComparisonTrendPoint,
} from "@/types/admin-business-analytics";
import type {
  BudgetRange,
  CustomerType,
  IntentTier,
  Prisma,
  PurchaseStatus,
  SchemeEnrollmentOutcome,
  SchemeProduct,
  SourceChannel,
  Visit,
  VisitType,
} from "@prisma/client";

type VisitRow = Pick<
  Visit,
  | "id"
  | "visitDate"
  | "storeId"
  | "staffId"
  | "customerType"
  | "purchaseStatus"
  | "transactionAmount"
  | "budgetStated"
  | "intentTier"
  | "sourceChannel"
  | "gender"
  | "ageGroup"
  | "area"
  | "visitType"
  | "productsExplored"
  | "productsPurchased"
  | "schemesPitched"
  | "enrollmentOutcome"
  | "schemeEnrolled"
  | "customerPhoneHash"
> & {
  staff: { name: string };
};

const visitSelect = {
  id: true,
  visitDate: true,
  storeId: true,
  staffId: true,
  customerType: true,
  purchaseStatus: true,
  transactionAmount: true,
  budgetStated: true,
  intentTier: true,
  sourceChannel: true,
  gender: true,
  ageGroup: true,
  area: true,
  visitType: true,
  productsExplored: true,
  productsPurchased: true,
  schemesPitched: true,
  enrollmentOutcome: true,
  schemeEnrolled: true,
  customerPhoneHash: true,
  staff: { select: { name: true } },
} satisfies Prisma.VisitSelect;

function isActive(query: AdminBusinessAnalyticsQuery, key: AnalyticsFilterKey): boolean {
  return isAnalyticsFilterActive(query, key);
}

function buildVisitWhere(
  query: AdminBusinessAnalyticsQuery,
  range: { start: Date; end: Date },
): Prisma.VisitWhereInput {
  const where: Prisma.VisitWhereInput = {
    visitDate: { gte: range.start, lte: range.end },
  };

  const storeScope: Prisma.StoreWhereInput = {};
  if (isActive(query, "storeId") && query.storeId) {
    storeScope.id = query.storeId;
  } else {
    if (isActive(query, "city") && query.city) {
      storeScope.city = { equals: query.city, mode: "insensitive" };
    }
    if (isActive(query, "storeCategory") && query.storeCategory) {
      storeScope.category = query.storeCategory;
    }
  }
  where.store = mergeStoreWhere(storeScope);

  if (isActive(query, "staffId") && query.staffId) where.staffId = query.staffId;

  if (isActive(query, "customerType") && query.customerType) {
    where.customerType = query.customerType as CustomerType;
  }

  if (isActive(query, "intentTier") && query.intentTier) {
    where.intentTier =
      query.intentTier === ANALYTICS_FILTER_NA
        ? null
        : (query.intentTier as IntentTier);
  }

  if (isActive(query, "purchaseStatus") && query.purchaseStatus) {
    where.purchaseStatus = query.purchaseStatus as PurchaseStatus;
  }

  if (isActive(query, "visitType") && query.visitType) {
    where.visitType = query.visitType as VisitType;
  }

  if (isActive(query, "sourceChannel") && query.sourceChannel) {
    where.sourceChannel = query.sourceChannel as SourceChannel;
  }

  if (isActive(query, "gender") && query.gender) {
    where.gender = query.gender === ANALYTICS_FILTER_NA ? null : query.gender;
  }

  if (isActive(query, "ageGroup") && query.ageGroup) {
    where.ageGroup = query.ageGroup === ANALYTICS_FILTER_NA ? null : query.ageGroup;
  }

  if (isActive(query, "area") && query.area) {
    where.area =
      query.area === ANALYTICS_FILTER_NA
        ? null
        : { equals: query.area, mode: "insensitive" };
  }

  if (isActive(query, "budgetRange") && query.budgetRange) {
    where.budgetStated =
      query.budgetRange === ANALYTICS_FILTER_NA
        ? null
        : (query.budgetRange as BudgetRange);
  }

  if (isActive(query, "schemeEnrolled")) {
    if (query.schemeEnrolledNa) {
      where.enrollmentOutcome = null;
      where.NOT = {
        schemesPitched: { hasSome: ["GHS", "GPP"] },
      };
    } else if (query.schemeEnrolled !== undefined) {
      where.schemeEnrolled = query.schemeEnrolled;
    }
  }

  if (isActive(query, "enrollmentOutcome") && query.enrollmentOutcome) {
    where.enrollmentOutcome =
      query.enrollmentOutcome === ANALYTICS_FILTER_NA
        ? null
        : (query.enrollmentOutcome as SchemeEnrollmentOutcome);
  }

  if (isActive(query, "schemeProduct") && query.schemeProduct) {
    if (query.schemeProduct === ANALYTICS_FILTER_NA) {
      where.NOT = {
        schemesPitched: { hasSome: ["GHS", "GPP"] },
      };
    } else {
      where.schemesPitched = { has: query.schemeProduct as SchemeProduct };
    }
  }

  if (isActive(query, "productCategory") && query.productCategory) {
    if (String(query.productCategory) === ANALYTICS_FILTER_NA) {
      where.AND = [
        { productsExplored: { equals: [] } },
        { productsPurchased: { equals: [] } },
      ];
    } else {
      where.OR = [
        { productsExplored: { has: query.productCategory } },
        { productsPurchased: { has: query.productCategory } },
      ];
    }
  }

  return where;
}

function applyPostFilters(
  visits: VisitRow[],
  query: AdminBusinessAnalyticsQuery,
): VisitRow[] {
  return visits.filter((visit) => {
    if (isActive(query, "segment") && !matchesCallSegment(visit, query.segment)) {
      return false;
    }
    if (isActive(query, "valueTier") && !matchesCallValueTier(visit, query.valueTier)) {
      return false;
    }
    return true;
  });
}

function buildAppliedFilters(
  query: AdminBusinessAnalyticsQuery,
  options: AdminBusinessAnalyticsFilterOptions,
): AnalyticsAppliedFilter[] {
  if (!query.activeFilters?.length) return [];

  const storeName = options.stores.find((store) => store.id === query.storeId)?.name;
  const staffName = options.staff.find((member) => member.id === query.staffId)?.name;

  const labelFor = (list: { value: string; label: string }[], value?: string) =>
    list.find((item) => item.value === value)?.label ?? value ?? "";

  const applied: AnalyticsAppliedFilter[] = [];

  for (const key of query.activeFilters) {
    switch (key as AnalyticsFilterKey) {
      case "storeId":
        if (storeName) applied.push({ key, label: "Store", value: storeName });
        break;
      case "city":
        if (query.city) applied.push({ key, label: "City", value: query.city });
        break;
      case "storeCategory":
        if (query.storeCategory) {
          applied.push({
            key,
            label: "Category",
            value: getStoreCategoryLabel(query.storeCategory),
          });
        }
        break;
      case "staffId":
        if (staffName) applied.push({ key, label: "RSO", value: staffName });
        break;
      case "segment":
        if (query.segment && query.segment !== "ALL") {
          applied.push({
            key,
            label: "Segment",
            value: labelFor(options.segments, query.segment),
          });
        }
        break;
      case "valueTier":
        if (query.valueTier && query.valueTier !== "ALL") {
          applied.push({
            key,
            label: "Value tier",
            value: labelFor(options.valueTiers, query.valueTier),
          });
        }
        break;
      case "customerType":
        applied.push({
          key,
          label: "Customer type",
          value: labelFor(options.customerTypes, query.customerType),
        });
        break;
      case "intentTier":
        applied.push({
          key,
          label: "Intent",
          value:
            query.intentTier === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.intentTiers, query.intentTier),
        });
        break;
      case "purchaseStatus":
        applied.push({
          key,
          label: "Purchase status",
          value: labelFor(options.purchaseStatuses, query.purchaseStatus),
        });
        break;
      case "visitType":
        applied.push({
          key,
          label: "Visit type",
          value: labelFor(options.visitTypes, query.visitType),
        });
        break;
      case "sourceChannel":
        applied.push({
          key,
          label: "Source",
          value: labelFor(options.sourceChannels, query.sourceChannel),
        });
        break;
      case "gender":
        applied.push({
          key,
          label: "Gender",
          value:
            query.gender === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.genders, query.gender),
        });
        break;
      case "ageGroup":
        applied.push({
          key,
          label: "Age group",
          value:
            query.ageGroup === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.ageGroups, query.ageGroup),
        });
        break;
      case "area":
        applied.push({
          key,
          label: "Location",
          value: query.area === ANALYTICS_FILTER_NA ? "N/A" : (query.area ?? ""),
        });
        break;
      case "budgetRange":
        applied.push({
          key,
          label: "Price band",
          value:
            query.budgetRange === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.budgetRanges, query.budgetRange),
        });
        break;
      case "productCategory":
        applied.push({
          key,
          label: "Product",
          value:
            String(query.productCategory) === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.productCategories, query.productCategory),
        });
        break;
      case "schemeProduct":
        applied.push({
          key,
          label: "Scheme",
          value:
            query.schemeProduct === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.schemeProducts, query.schemeProduct),
        });
        break;
      case "enrollmentOutcome":
        applied.push({
          key,
          label: "Enrollment",
          value:
            query.enrollmentOutcome === ANALYTICS_FILTER_NA
              ? "N/A"
              : labelFor(options.enrollmentOutcomes, query.enrollmentOutcome),
        });
        break;
      case "schemeEnrolled":
        applied.push({
          key,
          label: "Scheme enrolled",
          value: query.schemeEnrolledNa
            ? "N/A"
            : query.schemeEnrolled
              ? "Yes"
              : "No",
        });
        break;
    }
  }

  return applied;
}

function countByKey<T extends string>(
  items: VisitRow[],
  getKey: (visit: VisitRow) => T | null | undefined,
  labelMap: Record<T, string>,
): BreakdownRow[] {
  const counts = new Map<string, number>();

  for (const visit of items) {
    const key = getKey(visit);
    if (!key) continue;
    const label = labelMap[key] ?? key;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function countArrayField(
  items: VisitRow[],
  getArray: (visit: VisitRow) => string[],
  labelMap: Record<string, string>,
): BreakdownRow[] {
  const counts = new Map<string, number>();

  for (const visit of items) {
    for (const raw of getArray(visit)) {
      const label = labelMap[raw] ?? raw;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function countNullableField(
  items: VisitRow[],
  getValue: (visit: VisitRow) => string | null | undefined,
): BreakdownRow[] {
  const counts = new Map<string, number>();

  for (const visit of items) {
    const value = getValue(visit)?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function buildTrends(visits: VisitRow[]): AnalyticsTrendPoint[] {
  const byDay = new Map<string, { visits: number; revenue: number }>();

  for (const visit of visits) {
    const date = visit.visitDate.toISOString().slice(0, 10);
    const row = byDay.get(date) ?? { visits: 0, revenue: 0 };
    row.visits += 1;
    row.revenue += visitRevenue(visit);
    byDay.set(date, row);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({ date, ...row }));
}

function countValueTier(items: VisitRow[]): BreakdownRow[] {
  const counts = new Map<string, number>();

  for (const visit of items) {
    const tier = computeVisitValueTier(visit);
    const label = LABELS.valueTier[tier];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function buildComparisonTrends(
  visitsA: VisitRow[],
  visitsB: VisitRow[],
): ComparisonTrendPoint[] {
  const bucketA = new Map<number, { visits: number; revenue: number }>();
  const bucketB = new Map<number, { visits: number; revenue: number }>();

  for (const visit of visitsA) {
    const day = visit.visitDate.getDate();
    const row = bucketA.get(day) ?? { visits: 0, revenue: 0 };
    row.visits += 1;
    row.revenue += visitRevenue(visit);
    bucketA.set(day, row);
  }

  for (const visit of visitsB) {
    const day = visit.visitDate.getDate();
    const row = bucketB.get(day) ?? { visits: 0, revenue: 0 };
    row.visits += 1;
    row.revenue += visitRevenue(visit);
    bucketB.set(day, row);
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

function buildSummary(
  visits: VisitRow[],
  fieldSalesCount: number,
): AnalyticsSummary {
  const uniqueCustomers = new Set(visits.map((v) => v.customerPhoneHash)).size;
  const revenueVisits = visits.map((v) => ({
    purchaseStatus: v.purchaseStatus,
    transactionAmount: v.transactionAmount,
  }));
  const purchasedCount = visits.filter((v) => v.purchaseStatus === "PURCHASED").length;
  const totalRevenue = calculateTotalRevenue(revenueVisits);

  return {
    totalVisits: visits.length,
    totalRevenue,
    conversionRate: calculateConversionRate(revenueVisits),
    uniqueCustomers,
    avgTransaction:
      purchasedCount > 0 ? Math.round(totalRevenue / purchasedCount) : 0,
    fieldSalesCount,
  };
}

async function fetchVisitsForRange(
  query: AdminBusinessAnalyticsQuery,
  range: ResolvedDateRange,
): Promise<VisitRow[]> {
  const where = buildVisitWhere(query, range);
  const rawVisits = await prisma.visit.findMany({
    where,
    select: visitSelect,
    orderBy: { visitDate: "asc" },
  });
  return applyPostFilters(rawVisits, query);
}

async function countFieldSalesForRange(
  query: AdminBusinessAnalyticsQuery,
  range: ResolvedDateRange,
): Promise<number> {
  const fieldSalesWhere: Prisma.FieldSaleWhereInput = {
    activityDate: { gte: range.start, lte: range.end },
  };
  const storeScope: Prisma.StoreWhereInput = {};
  if (isActive(query, "storeId") && query.storeId) {
    storeScope.id = query.storeId;
  } else {
    if (isActive(query, "city") && query.city) {
      storeScope.city = { equals: query.city, mode: "insensitive" };
    }
    if (isActive(query, "storeCategory") && query.storeCategory) {
      storeScope.category = query.storeCategory;
    }
  }
  fieldSalesWhere.store = mergeStoreWhere(storeScope);
  if (isActive(query, "staffId") && query.staffId) {
    fieldSalesWhere.staffId = query.staffId;
  }
  return prisma.fieldSale.count({ where: fieldSalesWhere });
}

function buildBreakdowns(visits: VisitRow[]): AdminBusinessAnalytics["breakdowns"] {
  return {
    customerType: countByKey(visits, (v) => v.customerType, LABELS.customerType),
    valueTier: countValueTier(visits),
    intentTier: countByKey(
      visits,
      (v) => v.intentTier ?? undefined,
      LABELS.intentTier,
    ),
    purchaseStatus: countByKey(visits, (v) => v.purchaseStatus, LABELS.purchaseStatus),
    sourceChannel: countByKey(visits, (v) => v.sourceChannel, LABELS.sourceChannel),
    gender: countByKey(
      visits,
      (v) => (v.gender as keyof typeof LABELS.gender | null) ?? undefined,
      LABELS.gender,
    ),
    ageGroup: countByKey(
      visits,
      (v) => (v.ageGroup as keyof typeof LABELS.ageGroup | null) ?? undefined,
      LABELS.ageGroup,
    ),
    area: countNullableField(visits, (v) => v.area),
    visitType: countByKey(visits, (v) => v.visitType, LABELS.visitType),
    budgetRange: countByKey(
      visits,
      (v) => v.budgetStated ?? undefined,
      LABELS.budgetRange,
    ),
    productsExplored: countArrayField(
      visits,
      (v) => v.productsExplored,
      LABELS.productCategory,
    ),
    productsPurchased: countArrayField(
      visits,
      (v) => v.productsPurchased,
      LABELS.productCategory,
    ),
    schemeProduct: countArrayField(
      visits,
      (v) => v.schemesPitched,
      LABELS.schemeProduct,
    ),
    enrollmentOutcome: countByKey(
      visits,
      (v) => v.enrollmentOutcome ?? undefined,
      LABELS.enrollmentOutcome,
    ),
    staff: buildStaffBreakdown(visits),
  };
}

function buildStaffBreakdown(visits: VisitRow[]): AdminBusinessAnalytics["breakdowns"]["staff"] {
  const byStaff = new Map<
    string,
    { staffId: string; label: string; visits: number; revenue: number }
  >();

  for (const visit of visits) {
    const existing = byStaff.get(visit.staffId) ?? {
      staffId: visit.staffId,
      label: visit.staff.name,
      visits: 0,
      revenue: 0,
    };
    existing.visits += 1;
    existing.revenue += visitRevenue(visit);
    byStaff.set(visit.staffId, existing);
  }

  return Array.from(byStaff.values()).sort((a, b) => b.revenue - a.revenue);
}

const LABELS = {
  customerType: { NEW: "New", REPEAT: "Repeat", VIP: "VIP" },
  intentTier: {
    HOT: "Hot intent",
    WARM: "Warm intent",
    COLD: "Cold intent",
    BROWSING: "Browsing",
  },
  purchaseStatus: {
    PURCHASED: "Purchased",
    NOT_PURCHASED: "Not purchased",
    PENDING: "Pending",
  },
  visitType: { WALK_IN: "Walk-in", APPOINTMENT: "Appointment" },
  sourceChannel: {
    ORGANIC_WALK_IN: "Organic walk-in",
    REFERRAL: "Referral",
    SOCIAL_MEDIA: "Social media",
    INTERNET: "Internet",
    PHONE: "Phone",
    USER_CALLS: "User calls",
    TANISHQ_REF: "Tanishq ref",
    CARATLANE_REF: "CaratLane ref",
    OTHER: "Other",
  },
  gender: {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    PREFER_NOT_TO_SAY: "Prefer not to say",
  },
  ageGroup: {
    "18-25": "18–25",
    "26-35": "26–35",
    "36-50": "36–50",
    "50+": "50+",
  },
  budgetRange: {
    UNDER_15K: "Under ₹15k",
    K15_50K: "₹15k–50k",
    K50_1L: "₹50k–1L",
    ABOVE_1L: "Above ₹1L",
    NOT_STATED: "Not stated",
  },
  productCategory: PRODUCT_CATEGORY_LABELS,
  schemeProduct: { GHS: "GHS", GPP: "JPP", NONE: "None" },
  enrollmentOutcome: {
    ENROLLED_GHS: "Enrolled GHS",
    ENROLLED_GPP: "Enrolled JPP",
    ENROLLED_BOTH: "Enrolled both",
    INTERESTED: "Interested",
    DECLINED: "Declined",
    CALLBACK: "Callback",
  },
  valueTier: { HIGH: "High value", MID: "Mid value", LOW: "Low value" },
} as const;

export async function getAdminBusinessAnalyticsFilterOptions(): Promise<AdminBusinessAnalyticsFilterOptions> {
  const cacheKey = "global"; // filter options are tenant-global (no per-user state)
  const cached = await getCachedFilterOptions(cacheKey);
  if (cached) return cached;

  const [stores, staff, areaRows] = await Promise.all([
    prisma.store.findMany({
      where: mergeStoreWhere({ isActive: true }),
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.staff.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, storeId: true },
    }),
    prisma.visit.findMany({
      where: { area: { not: null } },
      distinct: ["area"],
      select: { area: true },
      take: 200,
    }),
  ]);

  const areas = areaRows
    .map((row) => row.area)
    .filter((area): area is string => Boolean(area?.trim()))
    .sort((a, b) => a.localeCompare(b));

  const result: AdminBusinessAnalyticsFilterOptions = {
    stores,
    staff,
    areas,
    segments: [
      { value: "ALL", label: "All customers" },
      { value: "NEW", label: "New" },
      { value: "RETAINED", label: "Retained" },
      { value: "PURCHASED", label: "Purchased" },
      { value: "NOT_PURCHASED", label: "Not purchased" },
    ],
    valueTiers: [
      { value: "ALL", label: "All value tiers" },
      { value: "HIGH", label: LABELS.valueTier.HIGH },
      { value: "MID", label: LABELS.valueTier.MID },
      { value: "LOW", label: LABELS.valueTier.LOW },
    ],
    customerTypes: Object.entries(LABELS.customerType).map(([value, label]) => ({
      value,
      label,
    })),
    intentTiers: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.intentTier).map(([value, label]) => ({ value, label })),
    ],
    purchaseStatuses: Object.entries(LABELS.purchaseStatus).map(([value, label]) => ({
      value,
      label,
    })),
    visitTypes: Object.entries(LABELS.visitType).map(([value, label]) => ({
      value,
      label,
    })),
    sourceChannels: Object.entries(LABELS.sourceChannel).map(([value, label]) => ({
      value,
      label,
    })),
    genders: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.gender).map(([value, label]) => ({ value, label })),
    ],
    ageGroups: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.ageGroup).map(([value, label]) => ({ value, label })),
    ],
    budgetRanges: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.budgetRange).map(([value, label]) => ({ value, label })),
    ],
    productCategories: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.productCategory).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    schemeProducts: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.schemeProduct).map(([value, label]) => ({
        value,
        label,
      })),
    ],
    enrollmentOutcomes: [
      { value: ANALYTICS_FILTER_NA, label: "N/A" },
      ...Object.entries(LABELS.enrollmentOutcome).map(([value, label]) => ({
        value,
        label,
      })),
    ],
  };

  void setCachedFilterOptions(cacheKey, result);
  return result;
}

export async function getAdminBusinessAnalytics(
  query: AdminBusinessAnalyticsQuery,
): Promise<AdminBusinessAnalytics> {
  // Check summary cache first — keyed by versioned query hash (busted after visit writes)
  const cacheKey = await buildVersionedQueryKey(query);
  const cached = await getCachedSummary(cacheKey);
  if (cached) return cached;

  const resolved = resolveAnalyticsDates(query);
  const dateMode = query.dateMode ?? (resolved.kind === "compare" ? "compare" : "preset");
  const filterOptions = await getAdminBusinessAnalyticsFilterOptions();
  const appliedFilters = buildAppliedFilters(query, filterOptions);

  // Build a map of staffId → name for staff breakdowns from the aggregate path.
  const staffNameMap = new Map(filterOptions.staff.map((s) => [s.id, s.name]));

  if (resolved.kind === "compare") {
    // Aggregate path: fetch pre-aggregated rows for both periods in parallel.
    // Also fetch minimal array-field rows for product/scheme/valueTier/gender/area breakdowns.
    const [aggRowsA, aggRowsB, arrayRowsA, arrayRowsB, fieldSalesA, fieldSalesB] =
      await Promise.all([
        queryAggregateRows(query, resolved.rangeA.start, resolved.rangeA.end),
        queryAggregateRows(query, resolved.rangeB.start, resolved.rangeB.end),
        fetchArrayFieldRows(query, resolved.rangeA.start, resolved.rangeA.end),
        fetchArrayFieldRows(query, resolved.rangeB.start, resolved.rangeB.end),
        countFieldSalesForRange(query, resolved.rangeA),
        countFieldSalesForRange(query, resolved.rangeB),
      ]);

    const summaryA = buildSummaryFromAgg(aggRowsA, fieldSalesA);
    const summaryB = buildSummaryFromAgg(aggRowsB, fieldSalesB);

    const compareResult: AdminBusinessAnalytics = {
      dateMode: "compare",
      period: {
        start: resolved.rangeA.start.toISOString(),
        end: resolved.rangeA.end.toISOString(),
        label: resolved.rangeA.label,
      },
      summary: summaryA,
      trends: buildTrendsFromAgg(aggRowsA),
      breakdowns: buildCombinedBreakdowns(aggRowsA, arrayRowsA, staffNameMap),
      comparison: {
        period: {
          start: resolved.rangeB.start.toISOString(),
          end: resolved.rangeB.end.toISOString(),
          label: resolved.rangeB.label,
        },
        summary: summaryB,
        trends: buildTrendsFromAgg(aggRowsB),
        comparisonTrends: buildComparisonTrendsFromAgg(aggRowsA, aggRowsB),
        deltas: {
          totalVisits: percentDelta(summaryA.totalVisits, summaryB.totalVisits),
          totalRevenue: percentDelta(summaryA.totalRevenue, summaryB.totalRevenue),
          conversionRate: percentDelta(summaryA.conversionRate, summaryB.conversionRate),
          uniqueCustomers: percentDelta(summaryA.uniqueCustomers, summaryB.uniqueCustomers),
          avgTransaction: percentDelta(summaryA.avgTransaction, summaryB.avgTransaction),
          fieldSalesCount: percentDelta(summaryA.fieldSalesCount, summaryB.fieldSalesCount),
        },
      },
      appliedFilters,
      aiInsights: { available: false, summary: null, recommendations: [] },
    };
    void setCachedSummary(cacheKey, compareResult);
    return compareResult;
  }

  // Single period — aggregate path
  const [aggRows, arrayRows, fieldSalesCount] = await Promise.all([
    queryAggregateRows(query, resolved.range.start, resolved.range.end),
    fetchArrayFieldRows(query, resolved.range.start, resolved.range.end),
    countFieldSalesForRange(query, resolved.range),
  ]);

  const singleResult: AdminBusinessAnalytics = {
    dateMode,
    period: {
      start: resolved.range.start.toISOString(),
      end: resolved.range.end.toISOString(),
      label: resolved.range.label,
    },
    summary: buildSummaryFromAgg(aggRows, fieldSalesCount),
    trends: buildTrendsFromAgg(aggRows),
    breakdowns: buildCombinedBreakdowns(aggRows, arrayRows, staffNameMap),
    appliedFilters,
    aiInsights: { available: false, summary: null, recommendations: [] },
  };
  void setCachedSummary(cacheKey, singleResult);
  return singleResult;
}

// ---------------------------------------------------------------------------
// Combined breakdown builder — merges aggregate-view dims + array-field dims
// ---------------------------------------------------------------------------

function buildCombinedBreakdowns(
  aggRows: AggRowPublic[],
  arrayRows: ArrayVisitRowPublic[],
  staffNameMap: Map<string, string>,
): AdminBusinessAnalytics["breakdowns"] {
  const aggBreakdowns = buildBreakdownsFromAgg(aggRows);
  const arrayBreakdowns = buildArrayFieldBreakdowns(arrayRows);
  const staff = buildStaffBreakdownFromAgg(aggRows, staffNameMap);

  return {
    customerType: aggBreakdowns.customerType,
    intentTier: aggBreakdowns.intentTier,
    purchaseStatus: aggBreakdowns.purchaseStatus,
    sourceChannel: aggBreakdowns.sourceChannel,
    budgetRange: aggBreakdowns.budgetRange,
    valueTier: arrayBreakdowns.valueTier,
    productsExplored: arrayBreakdowns.productsExplored,
    productsPurchased: arrayBreakdowns.productsPurchased,
    schemeProduct: arrayBreakdowns.schemeProduct,
    enrollmentOutcome: arrayBreakdowns.enrollmentOutcome,
    gender: arrayBreakdowns.gender,
    ageGroup: arrayBreakdowns.ageGroup,
    area: arrayBreakdowns.area,
    visitType: arrayBreakdowns.visitType,
    staff,
  };
}
