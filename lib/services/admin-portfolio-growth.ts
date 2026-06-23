import { prisma } from "@/lib/db/prisma";
import { storeNotDeletedWhere } from "@/lib/db/store-scope";
import { ACTIVATION_WINDOW_DAYS } from "@/lib/utils/admin-portfolio-expansion-kpis";
import { getPeriodRange, getPreviousPeriodRange } from "@/lib/utils/analytics";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AdminPortfolioGrowthMetrics {
  activeStores30d: number;
  activeStoreUsageRate: number;
  platformGmv30d: number;
  totalVisits30d: number;
  purchasedVisits30d: number;
  portfolioConversionRate: number;
  openCorrectionRequests: number;
  usageDropStoreCount: number;
  totalCalls30d: number;
  callsLinkedToVisit30d: number;
  callToVisitRate: number;
  avgDaysToFirstVisit: number | null;
  activationRate14d: number;
  weeklyActiveOwners: number;
  totalBusinessOwners: number;
  weeklyActiveOwnerRate: number;
  dormantBusinessCount: number;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));
}

function countVisitsByStore(
  rows: Array<{ storeId: string }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.storeId, (map.get(row.storeId) ?? 0) + 1);
  }
  return map;
}

export async function getAdminPortfolioGrowthMetrics(
  reference = new Date(),
): Promise<AdminPortfolioGrowthMetrics> {
  const thirtyDaysStart = new Date(reference);
  thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 29);
  thirtyDaysStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(reference);
  periodEnd.setHours(23, 59, 59, 999);

  const weekRange = getPeriodRange("week", reference);
  const previousWeekRange = getPreviousPeriodRange("week", reference);
  const sevenDaysAgo = new Date(reference);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const visitStoreScope = { store: storeNotDeletedWhere };

  const [
    totalStores,
    activeStoreVisitRows,
    totalVisits30d,
    purchasedVisitStats,
    openCorrectionRequests,
    currentWeekVisits,
    previousWeekVisits,
    totalCalls30d,
    callsLinkedToVisit30d,
    stores,
    firstVisits,
    weeklyActiveOwners,
    totalBusinessOwners,
    storesWithVisit30d,
    portfolioStores,
  ] = await Promise.all([
    prisma.store.count({ where: storeNotDeletedWhere }),
    prisma.visit.findMany({
      where: {
        visitDate: { gte: thirtyDaysStart, lte: periodEnd },
        ...visitStoreScope,
      },
      distinct: ["storeId"],
      select: { storeId: true },
    }),
    prisma.visit.count({
      where: {
        visitDate: { gte: thirtyDaysStart, lte: periodEnd },
        ...visitStoreScope,
      },
    }),
    prisma.visit.aggregate({
      where: {
        visitDate: { gte: thirtyDaysStart, lte: periodEnd },
        purchaseStatus: "PURCHASED",
        ...visitStoreScope,
      },
      _sum: { transactionAmount: true },
      _count: true,
    }),
    prisma.correctionRequest.count({ where: { status: "OPEN" } }),
    prisma.visit.findMany({
      where: {
        visitDate: { gte: weekRange.start, lte: weekRange.end },
        ...visitStoreScope,
      },
      select: { storeId: true },
    }),
    prisma.visit.findMany({
      where: {
        visitDate: { gte: previousWeekRange.start, lte: previousWeekRange.end },
        ...visitStoreScope,
      },
      select: { storeId: true },
    }),
    prisma.staffCallLog.count({
      where: {
        createdAt: { gte: thirtyDaysStart, lte: periodEnd },
        staff: { store: storeNotDeletedWhere },
      },
    }),
    prisma.staffCallLog.count({
      where: {
        createdAt: { gte: thirtyDaysStart, lte: periodEnd },
        visitId: { not: null },
        staff: { store: storeNotDeletedWhere },
      },
    }),
    prisma.store.findMany({
      where: storeNotDeletedWhere,
      select: { id: true, createdAt: true },
    }),
    prisma.visit.groupBy({
      by: ["storeId"],
      where: visitStoreScope,
      _min: { visitDate: true },
    }),
    prisma.appUser.count({
      where: {
        role: "BUSINESS_OWNER",
        isActive: true,
        lastLoginAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.appUser.count({
      where: { role: "BUSINESS_OWNER", isActive: true },
    }),
    prisma.visit.findMany({
      where: {
        visitDate: { gte: thirtyDaysStart, lte: periodEnd },
        ...visitStoreScope,
      },
      distinct: ["storeId"],
      select: { storeId: true },
    }),
    getAdminPortfolioStoreRows(),
  ]);

  const activeStores30d = activeStoreVisitRows.length;
  const activeStoreUsageRate =
    totalStores > 0 ? Math.round((activeStores30d / totalStores) * 100) : 0;

  const purchasedVisits30d = purchasedVisitStats._count;
  const platformGmv30d = purchasedVisitStats._sum.transactionAmount ?? 0;
  const portfolioConversionRate =
    totalVisits30d > 0
      ? Math.round((purchasedVisits30d / totalVisits30d) * 1000) / 10
      : 0;

  const currentWeekCounts = countVisitsByStore(currentWeekVisits);
  const previousWeekCounts = countVisitsByStore(previousWeekVisits);
  let usageDropStoreCount = 0;

  for (const [storeId, previousCount] of previousWeekCounts) {
    if (previousCount < 1) continue;
    const currentCount = currentWeekCounts.get(storeId) ?? 0;
    if (currentCount < previousCount * 0.5) usageDropStoreCount += 1;
  }

  const callToVisitRate =
    totalCalls30d > 0
      ? Math.round((callsLinkedToVisit30d / totalCalls30d) * 1000) / 10
      : 0;

  const firstVisitByStore = new Map(
    firstVisits.map((row) => [row.storeId, row._min.visitDate]),
  );

  let totalDaysToFirstVisit = 0;
  let storesWithFirstVisit = 0;
  let activationNumerator = 0;

  for (const store of stores) {
    const firstVisit = firstVisitByStore.get(store.id);
    if (!firstVisit) continue;

    const days = daysBetween(store.createdAt, firstVisit);
    storesWithFirstVisit += 1;
    totalDaysToFirstVisit += days;
    if (days <= ACTIVATION_WINDOW_DAYS) activationNumerator += 1;
  }

  const avgDaysToFirstVisit =
    storesWithFirstVisit > 0
      ? Math.round(totalDaysToFirstVisit / storesWithFirstVisit)
      : null;

  const activationRate14d =
    stores.length > 0 ? Math.round((activationNumerator / stores.length) * 100) : 0;

  const weeklyActiveOwnerRate =
    totalBusinessOwners > 0
      ? Math.round((weeklyActiveOwners / totalBusinessOwners) * 100)
      : 0;

  const activeStoreIdSet = new Set(storesWithVisit30d.map((row) => row.storeId));
  const businesses = groupStoresByBusiness(portfolioStores);
  let dormantBusinessCount = 0;

  for (const business of businesses) {
    const hasRecentActivity = business.stores.some((store) =>
      activeStoreIdSet.has(store.storeId),
    );
    if (!hasRecentActivity) dormantBusinessCount += 1;
  }

  return {
    activeStores30d,
    activeStoreUsageRate,
    platformGmv30d,
    totalVisits30d,
    purchasedVisits30d,
    portfolioConversionRate,
    openCorrectionRequests,
    usageDropStoreCount,
    totalCalls30d,
    callsLinkedToVisit30d,
    callToVisitRate,
    avgDaysToFirstVisit,
    activationRate14d,
    weeklyActiveOwners,
    totalBusinessOwners,
    weeklyActiveOwnerRate,
    dormantBusinessCount,
  };
}
