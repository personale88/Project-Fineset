import { COHORT_PIVOT_LABELS, type CohortPivotDimension } from "@/lib/analytics/cohort-pivot";
import { formatCurrency } from "@/lib/utils/formatters";
import type { AnalyticsAskReport } from "@/types/admin-business-analytics-ask";
import type { AdminBusinessAnalytics } from "@/types/admin-business-analytics";

export function buildRuleBasedAskReport(
  analytics: AdminBusinessAnalytics,
  breakdownDimension: CohortPivotDimension,
  options?: {
    dataAvailability?: "ok" | "empty" | "sparse";
    emptyMessage?: string;
    sparseMessage?: string;
  },
): AnalyticsAskReport {
  if (options?.dataAvailability === "empty" && options.emptyMessage) {
    return {
      summary: options.emptyMessage,
      highlights: [
        "No visit records matched your selected period and scope.",
        "Charts and KPIs show zero because nothing was logged in FineSet for this window.",
      ],
      recommendations: [
        "Widen the date range or remove city/category/store filters.",
        "Confirm staff are logging visits in the store portal for this period.",
      ],
    };
  }

  const { summary } = analytics;
  const highlights: string[] = [];
  const recommendations: string[] = [];

  highlights.push(
    `${summary.totalVisits.toLocaleString("en-IN")} visits in ${analytics.period.label} with ${formatCurrency(summary.totalRevenue)} revenue.`,
  );
  highlights.push(
    `Conversion rate ${summary.conversionRate}% across ${summary.uniqueCustomers.toLocaleString("en-IN")} unique customers.`,
  );

  if (analytics.comparison) {
    const d = analytics.comparison.deltas;
    const revDir = d.totalRevenue >= 0 ? "up" : "down";
    highlights.push(
      `Revenue is ${revDir} ${Math.abs(d.totalRevenue)}% vs ${analytics.comparison.period.label}.`,
    );
    highlights.push(
      `Visits changed ${d.totalVisits >= 0 ? "+" : ""}${d.totalVisits}% period over period.`,
    );

    if (d.totalRevenue < -10) {
      recommendations.push(
        "Investigate drop in revenue: review top RSO performers and visit sources that declined vs the prior period.",
      );
    }
    if (d.conversionRate < -5) {
      recommendations.push(
        "Conversion fell vs prior period — coach staff on scheme pitching (GHS/GPP) and follow-up for warm intent visits.",
      );
    }
    if (d.totalRevenue > 10) {
      recommendations.push(
        "Sustain momentum: double down on sources and product categories that drove the revenue lift.",
      );
    }
  }

  const rows = getBreakdownRowsForReport(analytics, breakdownDimension);
  const top = rows[0];
  if (top) {
    highlights.push(
      `Top ${COHORT_PIVOT_LABELS[breakdownDimension]}: ${top.label} (${top.count} visits).`,
    );
    if (top.count > summary.totalVisits * 0.5 && rows.length > 1) {
      recommendations.push(
        `Traffic is concentrated in "${top.label}" — diversify outreach to other ${COHORT_PIVOT_LABELS[breakdownDimension].toLowerCase()} segments.`,
      );
    }
  }

  if (summary.conversionRate < 15) {
    recommendations.push(
      "Conversion is below typical retail targets — prioritize hot/warm intent visits and post-visit call follow-ups.",
    );
  }

  if (summary.avgTransaction > 0 && summary.avgTransaction < 25000) {
    recommendations.push(
      "Average transaction is modest — train staff on upsell paths (sets, higher price bands) and scheme enrollment.",
    );
  }

  if (recommendations.length < 3) {
    recommendations.push(
      "Review RSO performance in store dashboards to align coaching with highest visit volume staff.",
    );
    recommendations.push(
      "Ask follow-up questions with specific chart types (line, pie, radar) to explore other dimensions.",
    );
  }

  const summaryText = analytics.comparison
    ? `For ${analytics.period.label} compared with ${analytics.comparison.period.label}, the portfolio recorded ${summary.totalVisits} visits and ${formatCurrency(summary.totalRevenue)} in revenue at ${summary.conversionRate}% conversion.`
    : `For ${analytics.period.label}, the portfolio recorded ${summary.totalVisits} visits and ${formatCurrency(summary.totalRevenue)} in revenue at ${summary.conversionRate}% conversion.`;

  const report: AnalyticsAskReport = {
    summary: options?.sparseMessage
      ? `${summaryText} ${options.sparseMessage}`
      : summaryText,
    highlights: highlights.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
  };

  return report;
}

function getBreakdownRowsForReport(
  analytics: AdminBusinessAnalytics,
  dimension: CohortPivotDimension,
) {
  switch (dimension) {
    case "customerType":
      return analytics.breakdowns.customerType;
    case "valueTier":
      return analytics.breakdowns.valueTier;
    case "intentTier":
      return analytics.breakdowns.intentTier;
    case "purchaseStatus":
      return analytics.breakdowns.purchaseStatus;
    case "sourceChannel":
      return analytics.breakdowns.sourceChannel;
    case "gender":
      return analytics.breakdowns.gender;
    case "ageGroup":
      return analytics.breakdowns.ageGroup;
    case "area":
      return analytics.breakdowns.area;
    case "visitType":
      return analytics.breakdowns.visitType;
    case "budgetRange":
      return analytics.breakdowns.budgetRange;
    case "productCategory":
      return analytics.breakdowns.productsExplored;
    case "schemeProduct":
      return analytics.breakdowns.schemeProduct;
    case "enrollmentOutcome":
      return analytics.breakdowns.enrollmentOutcome;
  }
}
