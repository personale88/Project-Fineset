import { prisma } from "@/lib/db/prisma";
import { buildCallNotesInsights } from "@/lib/services/call-feedback-insights";
import { computeVisitValueTier } from "@/lib/services/call-list-utils";
import type { AnalyticsPeriod, StoreCallAnalytics } from "@/types";
import type {
  CallAnswerStatus,
  CustomerType,
  IntentTier,
  PurchaseStatus,
  SourceChannel,
} from "@prisma/client";
import {
  buildPurchasedVisitsByPhone,
  calculateCallToConversionPercent,
  isAnsweredCallConverted,
} from "@/lib/utils/call-conversion";
import {
  calculateConversionRate,
  calculateDelta,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@/lib/utils/analytics";
import { formatPercent } from "@/lib/utils/formatters";
import {
  buildVisitPurchaseStatusBreakdown,
  toVisitPurchaseStatusLabelRows,
} from "@/lib/utils/visit-analytics-breakdown";

type PeriodLabel = AnalyticsPeriod["label"];

interface CallLogRow {
  id: string;
  answered: CallAnswerStatus;
  feedback: string | null;
  createdAt: Date;
  staffId: string;
  visitId: string;
  staff: { name: string };
  visit: {
    purchaseStatus: PurchaseStatus;
    customerType: CustomerType;
    intentTier: IntentTier | null;
    customerPhoneHash: string;
    transactionAmount: number | null;
    budgetStated: import("@prisma/client").BudgetRange | null;
    followUp: { status: import("@prisma/client").FollowUpStatus } | null;
  };
}

const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  NEW: "New",
  REPEAT: "Repeat",
  VIP: "VIP",
};

const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PURCHASED: "Purchased",
  NOT_PURCHASED: "Not purchased",
  PENDING: "Pending",
};

const INTENT_LABELS: Record<IntentTier, string> = {
  HOT: "Hot intent",
  WARM: "Warm intent",
  COLD: "Cold intent",
  BROWSING: "Browsing",
};

const VALUE_TIER_LABELS = {
  HIGH: "High value",
  MID: "Mid value",
  LOW: "Low value",
} as const;

const callLogSelect = {
  id: true,
  answered: true,
  feedback: true,
  createdAt: true,
  staffId: true,
  visitId: true,
  staff: { select: { name: true } },
  visit: {
    select: {
      purchaseStatus: true,
      customerType: true,
      intentTier: true,
      customerPhoneHash: true,
      transactionAmount: true,
      budgetStated: true,
      followUp: { select: { status: true } },
    },
  },
} as const;

function answerRatePercent(answered: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((answered / total) * 1000) / 10;
}

async function fetchCallLogsForStore(
  storeId: string,
  start: Date,
  end: Date,
): Promise<CallLogRow[]> {
  const logs = await prisma.staffCallLog.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      visitId: { not: null },
      visit: { storeId },
    },
    select: callLogSelect,
    orderBy: { createdAt: "asc" },
  });

  return logs.filter(
    (log): log is CallLogRow => log.visitId != null && log.visit != null,
  );
}

async function fetchPurchasedVisitsByPhone(
  storeId: string,
  earliestDate: Date,
) {
  return prisma.visit.findMany({
    where: {
      storeId,
      purchaseStatus: "PURCHASED",
      visitDate: { gte: earliestDate },
    },
    select: { customerPhoneHash: true, visitDate: true },
  });
}

async function countEligiblePool(storeId: string, start: Date, end: Date): Promise<number> {
  return prisma.visit.count({
    where: {
      storeId,
      visitDate: { gte: start, lte: end },
      OR: [
        { followUpNeeded: true },
        { followUp: { status: "OPEN" } },
        { purchaseStatus: "NOT_PURCHASED" },
      ],
    },
  });
}

async function fetchVisitsFromUserCalls(
  storeId: string,
  start: Date,
  end: Date,
): Promise<Array<{ purchaseStatus: PurchaseStatus }>> {
  try {
    return await prisma.visit.findMany({
      where: {
        storeId,
        sourceChannel: "USER_CALLS" satisfies SourceChannel,
        visitDate: { gte: start, lte: end },
      },
      select: {
        purchaseStatus: true,
      },
    });
  } catch (error) {
    console.warn("[store-call-analytics] USER_CALLS visit query failed", error);
    return [];
  }
}

function buildStoreVisitsFromCallsMetrics(
  visits: Array<{ purchaseStatus: PurchaseStatus }>,
) {
  const storeVisitsFromCalls = visits.length;
  const storeVisitsFromCallsPurchased = visits.filter(
    (v) => v.purchaseStatus === "PURCHASED",
  ).length;

  return {
    storeVisitsFromCalls,
    storeVisitsFromCallsPurchased,
    storeVisitsFromCallsConversionPercent: calculateConversionRate(visits),
  };
}

interface PeriodMetrics {
  summary: StoreCallAnalytics["summary"];
  staffBreakdown: StoreCallAnalytics["staffBreakdown"];
  byCustomerType: StoreCallAnalytics["byCustomerType"];
  byPurchaseStatus: StoreCallAnalytics["byPurchaseStatus"];
  byValueTier: StoreCallAnalytics["byValueTier"];
  byIntentTier: StoreCallAnalytics["byIntentTier"];
  notesInsights: StoreCallAnalytics["notesInsights"];
  highlights: StoreCallAnalytics["highlights"];
}

function aggregatePeriodMetrics(
  callLogs: CallLogRow[],
  purchasedByPhone: Map<string, Date[]>,
  eligiblePool: number,
  notesInsights: StoreCallAnalytics["notesInsights"],
): PeriodMetrics {
  const answeredLogs = callLogs.filter((c) => c.answered === "ANSWERED");
  const notAnswered = callLogs.length - answeredLogs.length;
  const convertedAnswered = answeredLogs.filter((c) =>
    isAnsweredCallConverted(c, purchasedByPhone),
  ).length;
  const callToConversionPercent = calculateCallToConversionPercent(
    answeredLogs.length,
    convertedAnswered,
  );

  const feedbackLogs = callLogs.filter((c) => c.feedback?.trim());
  const feedbackLengths = feedbackLogs.map((c) => c.feedback!.trim().length);
  const uniqueVisitsCalled = new Set(callLogs.map((c) => c.visitId)).size;
  const staffIds = new Set(callLogs.map((c) => c.staffId));

  const staffMap = new Map<
    string,
    {
      staffName: string;
      totalCalls: number;
      answered: number;
      notAnswered: number;
      convertedAnswered: number;
      visitIds: Set<string>;
      feedback: number;
    }
  >();

  for (const log of callLogs) {
    const entry =
      staffMap.get(log.staffId) ??
      {
        staffName: log.staff.name,
        totalCalls: 0,
        answered: 0,
        notAnswered: 0,
        convertedAnswered: 0,
        visitIds: new Set<string>(),
        feedback: 0,
      };
    entry.totalCalls += 1;
    if (log.answered === "ANSWERED") {
      entry.answered += 1;
      if (isAnsweredCallConverted(log, purchasedByPhone)) {
        entry.convertedAnswered += 1;
      }
    } else {
      entry.notAnswered += 1;
    }
    if (log.feedback?.trim()) entry.feedback += 1;
    entry.visitIds.add(log.visitId);
    staffMap.set(log.staffId, entry);
  }

  const staffBreakdown = [...staffMap.entries()]
    .map(([staffId, s]) => ({
      staffId,
      staffName: s.staffName,
      totalCalls: s.totalCalls,
      answered: s.answered,
      notAnswered: s.notAnswered,
      answerRatePercent: answerRatePercent(s.answered, s.totalCalls),
      callToConversionPercent: calculateCallToConversionPercent(
        s.answered,
        s.convertedAnswered,
      ),
      uniqueVisitsCalled: s.visitIds.size,
      callsWithFeedback: s.feedback,
    }))
    .sort((a, b) => b.totalCalls - a.totalCalls);

  function buildBreakdown<T extends string>(
    getKey: (log: CallLogRow) => T | null,
    labels: Record<T, string>,
  ): StoreCallAnalytics["byCustomerType"] {
    const map = new Map<string, { label: string; total: number; answered: number; notAnswered: number }>();
    for (const log of callLogs) {
      const key = getKey(log);
      if (!key) continue;
      const label = labels[key];
      const row = map.get(key) ?? { label, total: 0, answered: 0, notAnswered: 0 };
      row.total += 1;
      if (log.answered === "ANSWERED") row.answered += 1;
      else row.notAnswered += 1;
      map.set(key, row);
    }
    return [...map.values()]
      .map((r) => ({
        label: r.label,
        total: r.total,
        answered: r.answered,
        notAnswered: r.notAnswered,
        answerRatePercent: answerRatePercent(r.answered, r.total),
      }))
      .sort((a, b) => b.total - a.total);
  }

  const byCustomerType = buildBreakdown(
    (l) => l.visit.customerType,
    CUSTOMER_TYPE_LABELS,
  );
  const byPurchaseStatus = buildBreakdown(
    (l) => l.visit.purchaseStatus,
    PURCHASE_STATUS_LABELS,
  );
  const byIntentTier = buildBreakdown(
    (l) => l.visit.intentTier,
    INTENT_LABELS,
  );

  const valueTierMap = new Map<
    string,
    { label: string; total: number; answered: number; notAnswered: number }
  >();
  for (const log of callLogs) {
    const tier = computeVisitValueTier(log.visit);
    const label = VALUE_TIER_LABELS[tier];
    const row = valueTierMap.get(tier) ?? { label, total: 0, answered: 0, notAnswered: 0 };
    row.total += 1;
    if (log.answered === "ANSWERED") row.answered += 1;
    else row.notAnswered += 1;
    valueTierMap.set(tier, row);
  }
  const byValueTier = [...valueTierMap.values()]
    .map((r) => ({
      label: r.label,
      total: r.total,
      answered: r.answered,
      notAnswered: r.notAnswered,
      answerRatePercent: answerRatePercent(r.answered, r.total),
    }))
    .sort((a, b) => b.total - a.total);

  const staffWithCalls = staffBreakdown.filter((s) => s.totalCalls >= 3);
  const bestAnswerRate =
    staffWithCalls.length > 0
      ? staffWithCalls.reduce((best, row) =>
          row.answerRatePercent > best.answerRatePercent ? row : best,
        )
      : null;

  const needsAttention = staffBreakdown
    .filter((s) => s.totalCalls >= 3 && s.answerRatePercent < 40)
    .slice(0, 3);

  return {
    summary: {
      totalCalls: callLogs.length,
      answered: answeredLogs.length,
      notAnswered,
      answerRatePercent: answerRatePercent(answeredLogs.length, callLogs.length),
      activeStaffCount: staffIds.size,
      avgCallsPerStaff:
        staffIds.size > 0
          ? Math.round((callLogs.length / staffIds.size) * 10) / 10
          : 0,
      callsWithFeedback: feedbackLogs.length,
      feedbackRatePercent: answerRatePercent(feedbackLogs.length, callLogs.length),
      avgFeedbackLength:
        feedbackLengths.length > 0
          ? Math.round(
              feedbackLengths.reduce((sum, n) => sum + n, 0) / feedbackLengths.length,
            )
          : 0,
      eligiblePool,
      coverageRatePercent:
        eligiblePool > 0
          ? Math.round((uniqueVisitsCalled / eligiblePool) * 1000) / 10
          : 0,
      answeredCallsConverted: convertedAnswered,
      callToConversionPercent,
      storeVisitsFromCalls: 0,
      storeVisitsFromCallsPurchased: 0,
      storeVisitsFromCallsConversionPercent: 0,
    },
    staffBreakdown,
    byCustomerType,
    byPurchaseStatus,
    byValueTier,
    byIntentTier,
    notesInsights,
    highlights: {
      bestAnswerRate: bestAnswerRate
        ? {
            staffId: bestAnswerRate.staffId,
            staffName: bestAnswerRate.staffName,
            answerRatePercent: bestAnswerRate.answerRatePercent,
            answerRateLabel: formatPercent(bestAnswerRate.answerRatePercent),
          }
        : null,
      needsAttention: needsAttention.map((s) => ({
        staffId: s.staffId,
        staffName: s.staffName,
        notAnswered: s.notAnswered,
        answerRatePercent: s.answerRatePercent,
      })),
    },
  };
}

export async function getStoreCallAnalytics(
  storeId: string,
  period: PeriodLabel,
  referenceDate: Date = new Date(),
): Promise<StoreCallAnalytics> {
  const { start, end } = getPeriodRange(period, referenceDate);
  const previous = getPreviousPeriodRange(period, referenceDate);

  const [
    callLogs,
    previousLogs,
    purchasedVisits,
    eligiblePool,
    previousEligiblePool,
    userCallSourceVisits,
    previousUserCallSourceVisits,
    visitsInPeriod,
  ] = await Promise.all([
    fetchCallLogsForStore(storeId, start, end),
    fetchCallLogsForStore(storeId, previous.start, previous.end),
    fetchPurchasedVisitsByPhone(storeId, previous.start),
    countEligiblePool(storeId, start, end),
    countEligiblePool(storeId, previous.start, previous.end),
    fetchVisitsFromUserCalls(storeId, start, end),
    fetchVisitsFromUserCalls(storeId, previous.start, previous.end),
    prisma.visit.findMany({
      where: { storeId, visitDate: { gte: start, lte: end } },
      select: { purchaseStatus: true },
    }),
  ]);

  const visitLogByPurchaseStatus = toVisitPurchaseStatusLabelRows(
    buildVisitPurchaseStatusBreakdown(visitsInPeriod),
  );

  const purchasedByPhone = buildPurchasedVisitsByPhone(purchasedVisits);
  const feedbackSnippets = callLogs
    .map((c) => c.feedback?.trim())
    .filter((s): s is string => Boolean(s));

  const notesInsights = await buildCallNotesInsights({ feedbackSnippets });

  const current = aggregatePeriodMetrics(
    callLogs,
    purchasedByPhone,
    eligiblePool,
    notesInsights,
  );
  const userCallVisitMetrics = buildStoreVisitsFromCallsMetrics(userCallSourceVisits);
  current.summary = {
    ...current.summary,
    ...userCallVisitMetrics,
  };

  const prevMetrics = aggregatePeriodMetrics(
    previousLogs,
    purchasedByPhone,
    previousEligiblePool,
    {
      themes: [],
      recentSnippets: [],
      aiSummary: null,
      aiSummaryAvailable: notesInsights.aiSummaryAvailable,
    },
  );
  const previousUserCallVisitMetrics =
    buildStoreVisitsFromCallsMetrics(previousUserCallSourceVisits);
  prevMetrics.summary = {
    ...prevMetrics.summary,
    ...previousUserCallVisitMetrics,
  };

  return {
    period,
    periodRange: { start: start.toISOString(), end: end.toISOString() },
    ...current,
    visitLogByPurchaseStatus,
    deltas: {
      totalCalls: calculateDelta(current.summary.totalCalls, prevMetrics.summary.totalCalls),
      answered: calculateDelta(current.summary.answered, prevMetrics.summary.answered),
      notAnswered: calculateDelta(
        current.summary.notAnswered,
        prevMetrics.summary.notAnswered,
      ),
      answerRatePercent: calculateDelta(
        current.summary.answerRatePercent,
        prevMetrics.summary.answerRatePercent,
      ),
      coverageRatePercent: calculateDelta(
        current.summary.coverageRatePercent,
        prevMetrics.summary.coverageRatePercent,
      ),
      callToConversionPercent: calculateDelta(
        current.summary.callToConversionPercent,
        prevMetrics.summary.callToConversionPercent,
      ),
      storeVisitsFromCalls: calculateDelta(
        current.summary.storeVisitsFromCalls,
        prevMetrics.summary.storeVisitsFromCalls,
      ),
    },
  };
}
