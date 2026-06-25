"use client";

import { KPICard } from "@/components/analytics/KPICard";
import {
  formatAskKpiValue,
  type AskKpiCardSpec,
} from "@/lib/analytics/ask-kpis";
import type { AnalyticsSummary } from "@/types/admin-business-analytics";
import { formatCurrency } from "@/lib/utils/formatters";

export interface AskKpiGridLabels {
  visits: string;
  revenue: string;
  conversion: string;
  avgTransaction: string;
  fieldSales: string;
  uniqueCustomers: string;
}

export interface AskKpiGridProps {
  cards: AskKpiCardSpec[];
  summary: AnalyticsSummary;
  labels: AskKpiGridLabels;
}

export function AskKpiGrid({ cards, summary, labels }: AskKpiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 [&>*]:min-w-0">
      {cards.map((card) => (
        <KPICard
          key={card.metric}
          label={labels[card.metric]}
          value={formatAskKpiValue(card.metric, summary, formatCurrency)}
          unit={card.metric === "conversion" ? "%" : undefined}
          delta={card.delta}
        />
      ))}
    </div>
  );
}
