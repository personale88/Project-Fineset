/**
 * Converts a full AdminBusinessAnalytics object into a compact JSON summary
 * (~150–200 tokens) suitable for injection into a Gemini prompt.
 *
 * Excludes: full trend arrays (31 data points), all breakdown arrays beyond
 * the top-3 rows, and raw field arrays. This keeps the AI prompt concise while
 * preserving the most analytically meaningful signals.
 */

import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

export interface CompressedSummary {
  period: { label: string; start: string; end: string };
  kpis: {
    totalVisits: number;
    totalRevenue: number;
    conversionRate: number;
    uniqueCustomers: number;
    avgTransaction: number;
    fieldSalesCount: number;
  };
  dailyTrend?: Array<{ date: string; visits: number; revenue: number }>;
  comparison?: {
    period: { label: string; start: string; end: string };
    kpis: {
      totalVisits: number;
      totalRevenue: number;
      conversionRate: number;
      uniqueCustomers: number;
      avgTransaction: number;
    };
    deltas: {
      totalVisits: number;
      totalRevenue: number;
      conversionRate: number;
      uniqueCustomers: number;
      avgTransaction: number;
    };
  };
  topDimensions: {
    customerType: Array<{ label: string; count: number }>;
    sourceChannel: Array<{ label: string; count: number }>;
    topStaff: Array<{ label: string; visits: number; revenue: number }>;
  };
  topProducts?: Array<{ label: string; count: number }>;
  valueTier?: Array<{ label: string; count: number }>;
  dataAvailability: "ok" | "sparse" | "empty";
  appliedScope: string[];
}

/**
 * Classify data availability for honesty guardrails.
 * Mirrors the categories used in data-honesty.ts and ask-guardrails.ts.
 */
export function classifyDataAvailability(
  totalVisits: number,
): "ok" | "sparse" | "empty" {
  if (totalVisits === 0) return "empty";
  if (totalVisits < 10) return "sparse";
  return "ok";
}

export interface CompressSummaryOptions {
  includeDailyTrend?: boolean;
  includeProducts?: boolean;
  includeValueTier?: boolean;
}

/**
 * Compresses a full AdminBusinessAnalytics object into ~150–200 token summary.
 */
export function compressSummary(
  analytics: AdminBusinessAnalytics,
  options?: CompressSummaryOptions,
): CompressedSummary {
  const { summary, comparison, breakdowns, period, appliedFilters } = analytics;

  const dataAvailability = classifyDataAvailability(summary.totalVisits);

  const topCustomerType = (breakdowns.customerType ?? []).slice(0, 3);
  const topSourceChannel = (breakdowns.sourceChannel ?? []).slice(0, 3);
  const topStaff = (breakdowns.staff ?? [])
    .slice(0, 3)
    .map((s) => ({ label: s.label, visits: s.visits, revenue: s.revenue }));

  const base: CompressedSummary = {
    period: { label: period.label, start: period.start, end: period.end },
    kpis: {
      totalVisits: summary.totalVisits,
      totalRevenue: summary.totalRevenue,
      conversionRate: summary.conversionRate,
      uniqueCustomers: summary.uniqueCustomers,
      avgTransaction: summary.avgTransaction,
      fieldSalesCount: summary.fieldSalesCount,
    },
    topDimensions: {
      customerType: topCustomerType,
      sourceChannel: topSourceChannel,
      topStaff,
    },
    dataAvailability,
    appliedScope: appliedFilters.map((f) => `${f.label}: ${f.value}`),
  };

  if (comparison) {
    base.comparison = {
      period: {
        label: comparison.period.label,
        start: comparison.period.start,
        end: comparison.period.end,
      },
      kpis: {
        totalVisits: comparison.summary.totalVisits,
        totalRevenue: comparison.summary.totalRevenue,
        conversionRate: comparison.summary.conversionRate,
        uniqueCustomers: comparison.summary.uniqueCustomers,
        avgTransaction: comparison.summary.avgTransaction,
      },
      deltas: {
        totalVisits: comparison.deltas.totalVisits,
        totalRevenue: comparison.deltas.totalRevenue,
        conversionRate: comparison.deltas.conversionRate,
        uniqueCustomers: comparison.deltas.uniqueCustomers,
        avgTransaction: comparison.deltas.avgTransaction,
      },
    };
  }

  if (options?.includeDailyTrend && analytics.trends.length > 0) {
    base.dailyTrend = analytics.trends.slice(-14).map((point) => ({
      date: point.date,
      visits: point.visits,
      revenue: point.revenue,
    }));
  }

  if (options?.includeProducts) {
    base.topProducts = (breakdowns.productsExplored ?? []).slice(0, 5).map((row) => ({
      label: row.label,
      count: row.count,
    }));
  }

  if (options?.includeValueTier) {
    base.valueTier = (breakdowns.valueTier ?? []).slice(0, 5).map((row) => ({
      label: row.label,
      count: row.count,
    }));
  }

  return base;
}

/**
 * Serialises the compressed summary to a compact JSON string.
 * Omits null/undefined values and rounds floats to 2 decimal places.
 */
export function serializeSummary(summary: CompressedSummary): string {
  return JSON.stringify(summary, (_key, value) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "number" && !Number.isInteger(value)) {
      return Math.round(value * 100) / 100;
    }
    return value;
  });
}
