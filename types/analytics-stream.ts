/**
 * SSE event type definitions for the analytics streaming API.
 *
 * The POST /api/analytics/admin/business/ask endpoint emits these events
 * in order as the pipeline progresses. Each event has a `type` discriminator
 * and a typed `data` payload.
 */

import type {
  AnalyticsSummary,
  AnalyticsAppliedFilter,
} from "@/types/admin-business-analytics";
import type { ParseSource } from "@/lib/analytics/ask-confidence";
import type { DataAvailability } from "@/lib/analytics/ask-guardrails";
import type { TokenUsage } from "@/lib/analytics/token-estimate";
import type { AnalyticsAskChart, AnalyticsAskReport } from "@/types/admin-business-analytics-ask";
import type { DataConfidence } from "@/lib/analytics/data-honesty";

export interface KpisPayload {
  period: { start: string; end: string; label: string };
  comparisonPeriod?: { start: string; end: string; label: string };
  summary: AnalyticsSummary;
  comparisonSummary?: AnalyticsSummary;
  deltas?: {
    totalVisits: number;
    totalRevenue: number;
    conversionRate: number;
    uniqueCustomers: number;
    avgTransaction: number;
    fieldSalesCount: number;
  };
  charts: AnalyticsAskChart[];
  appliedFilters: AnalyticsAppliedFilter[];
  scopeLabel: string | null;
  dataAvailability: DataAvailability;
  dataConfidence: DataConfidence;
}

export type AnalyticsStreamEvent =
  | {
      type: "status";
      data: { phase: "parsing" | "querying" | "thinking"; message: string };
    }
  | {
      type: "intent";
      data: {
        interpretedQuery: string;
        parseSource: ParseSource;
        parseConfidence: string;
      };
    }
  | { type: "kpis"; data: KpisPayload }
  | { type: "report_chunk"; data: { text: string } }
  | {
      type: "report_complete";
      data: { report: AnalyticsAskReport };
    }
  | {
      type: "done";
      data: {
        status: string;
        balanceCredits: number;
        tokenUsage: TokenUsage | null;
      };
    }
  | { type: "error"; data: { code: string; message: string } };

/**
 * Serialises an event to the SSE wire format:
 *   data: {...JSON...}\n\n
 */
export function formatSseEvent(event: AnalyticsStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
