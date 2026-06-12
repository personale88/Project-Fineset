import { PORTAL_ACTOR_ROLES } from "@/lib/auth/resolve-staff";
import { prisma } from "@/lib/db/prisma";
import type { AnalyticsPeriod, RsoPerformanceRow, StoreRsoPerformance } from "@/types";
import {
  calculateSalesGrowthPercent,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@/lib/utils/analytics";
import { formatGrowthLabel, formatPercent, formatRevenueLakhs } from "@/lib/utils/formatters";
import {
  calculateVisitDataEntryScore,
  type VisitDataEntryInput,
} from "@/lib/utils/visit-data-entry-score";
import type { PurchaseStatus } from "@prisma/client";

interface StaffPeriodStats {
  staffId: string;
  staffName: string;
  previousPeriodSales: number;
  previousPeriodRevenue: number;
  currentPeriodSales: number;
  currentPeriodRevenue: number;
  customersAttended: number;
  purchased: number;
  notPurchased: number;
  schemesEnrolled: number;
  dataEntryScoreSum: number;
  dataEntryVisitCount: number;
}

function isWithinRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

function buildRevenueProgressLabel(previous: number, current: number): string {
  return `${formatRevenueLakhs(previous, 1)} → ${formatRevenueLakhs(current, 1)} revenue`;
}

function buildPeriodSalesLabel(sales: number, period: AnalyticsPeriod["label"]): string {
  const periodPhrases: Record<AnalyticsPeriod["label"], string> = {
    today: "today",
    yesterday: "yesterday",
    week: "this week",
    month: "this month",
    last3months: "in the last 3 months",
    last6months: "in the last 6 months",
  };

  return `${sales} ${sales === 1 ? "sale" : "sales"} ${periodPhrases[period]}`;
}

function accumulateCurrentPeriodVisitStats(
  stats: StaffPeriodStats,
  visit: VisitDataEntryInput & {
    purchaseStatus: PurchaseStatus;
    schemeEnrolled: boolean;
    transactionAmount: number | null;
  },
): void {
  stats.customersAttended += 1;

  if (visit.purchaseStatus === "PURCHASED") {
    stats.purchased += 1;
    stats.currentPeriodSales += 1;
    stats.currentPeriodRevenue += visit.transactionAmount ?? 0;
  } else if (visit.purchaseStatus === "NOT_PURCHASED") {
    stats.notPurchased += 1;
  }

  if (visit.schemeEnrolled) {
    stats.schemesEnrolled += 1;
  }

  stats.dataEntryScoreSum += calculateVisitDataEntryScore(visit);
  stats.dataEntryVisitCount += 1;
}

function createEmptyStaffPeriodStats(staffId: string, staffName: string): StaffPeriodStats {
  return {
    staffId,
    staffName,
    previousPeriodSales: 0,
    previousPeriodRevenue: 0,
    currentPeriodSales: 0,
    currentPeriodRevenue: 0,
    customersAttended: 0,
    purchased: 0,
    notPurchased: 0,
    schemesEnrolled: 0,
    dataEntryScoreSum: 0,
    dataEntryVisitCount: 0,
  };
}

function toPerformanceRow(stats: StaffPeriodStats): RsoPerformanceRow {
  const growthPercent = calculateSalesGrowthPercent(
    stats.currentPeriodRevenue,
    stats.previousPeriodRevenue,
  );
  const dataEntryScorePercent =
    stats.dataEntryVisitCount > 0
      ? Math.round(stats.dataEntryScoreSum / stats.dataEntryVisitCount)
      : 0;

  return {
    staffId: stats.staffId,
    staffName: stats.staffName,
    customersAttended: stats.customersAttended,
    purchased: stats.purchased,
    notPurchased: stats.notPurchased,
    schemesEnrolled: stats.schemesEnrolled,
    dataEntryScorePercent,
    dataEntryScoreLabel: formatPercent(dataEntryScorePercent, 0),
    growthPercent,
    growthLabel: formatGrowthLabel(growthPercent),
    growthTone:
      growthPercent > 0 ? "positive" : growthPercent < 0 ? "negative" : "neutral",
    revenue: stats.currentPeriodRevenue,
    revenueLabel: formatRevenueLakhs(stats.currentPeriodRevenue),
  };
}

export async function getStoreRsoPerformance(
  storeId: string,
  period: AnalyticsPeriod["label"],
  referenceDate: Date = new Date(),
): Promise<StoreRsoPerformance> {
  const currentRange = getPeriodRange(period, referenceDate);
  const previousRange = getPreviousPeriodRange(period, referenceDate);

  const [staff, visits] = await Promise.all([
    prisma.staff.findMany({
      where: {
        storeId,
        isActive: true,
        role: { in: [...PORTAL_ACTOR_ROLES] },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.visit.findMany({
      where: {
        storeId,
        visitDate: { gte: previousRange.start, lte: currentRange.end },
      },
      select: {
        staffId: true,
        visitDate: true,
        purchaseStatus: true,
        transactionAmount: true,
        schemeEnrolled: true,
        outTime: true,
        area: true,
        gender: true,
        ageGroup: true,
        productsPurchased: true,
        productsExplored: true,
        intentTier: true,
        reasonNoPurchase: true,
        competitorMention: true,
        purchaseOccasion: true,
        metalKtPref: true,
        budgetStated: true,
        schemesPitched: true,
        enrollmentOutcome: true,
        monthlyCommitment: true,
        reasonNoEnrollment: true,
        schemeCompetitorMention: true,
        followUpNeeded: true,
        followUpDate: true,
        staffNotes: true,
      },
    }),
  ]);

  const statsMap = new Map<string, StaffPeriodStats>(
    staff.map((member) => [member.id, createEmptyStaffPeriodStats(member.id, member.name)]),
  );

  const unmappedStaffIds = [
    ...new Set(visits.map((visit) => visit.staffId).filter((staffId) => !statsMap.has(staffId))),
  ];

  if (unmappedStaffIds.length > 0) {
    const extraStaff = await prisma.staff.findMany({
      where: { id: { in: unmappedStaffIds }, storeId },
      select: { id: true, name: true },
    });

    for (const member of extraStaff) {
      statsMap.set(member.id, createEmptyStaffPeriodStats(member.id, member.name));
    }
  }

  for (const visit of visits) {
    const stats = statsMap.get(visit.staffId);
    if (!stats) continue;

    if (isWithinRange(visit.visitDate, previousRange.start, previousRange.end)) {
      if (visit.purchaseStatus === "PURCHASED") {
        stats.previousPeriodSales += 1;
        stats.previousPeriodRevenue += visit.transactionAmount ?? 0;
      }
    }

    if (isWithinRange(visit.visitDate, currentRange.start, currentRange.end)) {
      accumulateCurrentPeriodVisitStats(stats, visit);
    }
  }

  const stats = Array.from(statsMap.values());

  const rows = stats
    .map(toPerformanceRow)
    .sort((a, b) => b.revenue - a.revenue || b.growthPercent - a.growthPercent);

  const topPerformerCandidate = stats.reduce<StaffPeriodStats | null>((best, row) => {
    if (!best) return row.currentPeriodRevenue > 0 ? row : null;
    if (row.currentPeriodRevenue > best.currentPeriodRevenue) return row;
    if (
      row.currentPeriodRevenue === best.currentPeriodRevenue &&
      row.currentPeriodSales > best.currentPeriodSales
    ) {
      return row;
    }
    return best;
  }, null);

  const mostImprovedCandidate = stats
    .filter((row) => row.previousPeriodRevenue > 0)
    .reduce<StaffPeriodStats | null>((best, row) => {
      const growth = calculateSalesGrowthPercent(
        row.currentPeriodRevenue,
        row.previousPeriodRevenue,
      );
      if (!best) return row;
      const bestGrowth = calculateSalesGrowthPercent(
        best.currentPeriodRevenue,
        best.previousPeriodRevenue,
      );
      return growth > bestGrowth ? row : best;
    }, null);

  return {
    period,
    periodRange: {
      start: currentRange.start.toISOString(),
      end: currentRange.end.toISOString(),
    },
    rows,
    topPerformer: topPerformerCandidate
      ? {
          staffId: topPerformerCandidate.staffId,
          staffName: topPerformerCandidate.staffName,
          salesLabel: buildPeriodSalesLabel(
            topPerformerCandidate.currentPeriodSales,
            period,
          ),
          revenueLabel: `${formatRevenueLakhs(topPerformerCandidate.currentPeriodRevenue, 1)} revenue`,
        }
      : null,
    mostImproved: mostImprovedCandidate
      ? {
          staffId: mostImprovedCandidate.staffId,
          staffName: mostImprovedCandidate.staffName,
          growthLabel: `${calculateSalesGrowthPercent(
            mostImprovedCandidate.currentPeriodRevenue,
            mostImprovedCandidate.previousPeriodRevenue,
          )}% growth`,
          salesProgressLabel: buildRevenueProgressLabel(
            mostImprovedCandidate.previousPeriodRevenue,
            mostImprovedCandidate.currentPeriodRevenue,
          ),
        }
      : null,
  };
}
