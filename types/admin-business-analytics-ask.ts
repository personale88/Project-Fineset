import type {
  AnalyticsTrendPoint,
  BreakdownRow,
  ComparisonTrendPoint,
} from "@/types/admin-business-analytics";
import type { ParseConfidence, ParseSource } from "@/lib/analytics/ask-confidence";
import type { TokenUsage } from "@/lib/analytics/token-estimate";

export type AnalyticsAskChartType =
  | "line"
  | "bar"
  | "pie"
  | "comparison"
  | "radar";

export interface AnalyticsAskRadarPoint {
  label: string;
  value: number;
  fullMark: number;
}

export interface AnalyticsAskChart {
  type: AnalyticsAskChartType;
  title: string;
  description?: string;
  trend?: AnalyticsTrendPoint[];
  breakdown?: BreakdownRow[];
  comparison?: ComparisonTrendPoint[];
  periodALabel?: string;
  periodBLabel?: string;
  radar?: AnalyticsAskRadarPoint[];
}

export interface AnalyticsAskReport {
  summary: string;
  highlights: string[];
  recommendations: string[];
  dataAvailability?: "ok" | "sparse" | "empty" | "none";
}

export interface AnalyticsAskConfirmationPreview {
  status: "confirmation_required";
  interpretedQuery: string;
  parseSource: ParseSource;
  parseConfidence: ParseConfidence;
  geminiConfigured: boolean;
  tokenUsage: TokenUsage | null;
  message: string;
}
