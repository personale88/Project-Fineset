"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { KPICard } from "@/components/analytics/KPICard";
import { ExportButton } from "@/components/shared/ExportButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { DashboardCollapsibleSection } from "@/components/shared/DashboardCollapsibleSection";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreCallAnalytics } from "@/hooks/useStoreCallAnalytics";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  buildStoreCallsLogHref,
  intentTierFromLabel,
  periodRangeToCallLogMonth,
  segmentFromCustomerTypeLabel,
  segmentFromPurchaseStatusLabel,
  valueTierFromLabel,
  type CallLogLinkFilters,
} from "@/lib/utils/call-analytics-links";
import { exportStaffCallBreakdownCsv } from "@/lib/utils/call-staff-export";
import {
  CHART_CARD_CLASS,
  CHART_CARD_CONTENT_CLASS,
  CHART_CARD_HEADER_CLASS,
  CHART_GRID_CLASS,
  TABS_LIST_SCROLL_CLASS,
  truncateChartLabel,
  VERTICAL_BAR_CHART_MARGIN,
} from "@/lib/utils/chart-layout";
import { formatPercent } from "@/lib/utils/formatters";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";
import { useChartCategoryAxisWidth } from "@/hooks/useChartCategoryAxisWidth";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import type { Content } from "@/content/en";
import type { StoreCallAnalytics, StoreCallBreakdownRow } from "@/types";

type CallsOverviewCopy = Content["store"]["callsOverview"];

const volumeChartConfig = {
  answered: { label: "Answered", color: "var(--status-success)" },
  notAnswered: { label: "Not answered", color: "var(--status-error)" },
} as const;

const attemptChartConfig = {
  visitCount: { label: "Visits", color: "var(--brand-gold)" },
} as const;

type SegmentChartKind = "customerType" | "purchaseStatus" | "valueTier" | "intent";

function useCallLogNavigation(
  periodRange: StoreCallAnalytics["periodRange"],
  storeId: string,
  dashboardBase = BUSINESS_OWNER_DASHBOARD_PATH,
) {
  const router = useRouter();
  const base = useMemo(
    () => ({ ...periodRangeToCallLogMonth(periodRange), storeId }),
    [periodRange, storeId],
  );

  const navigate = useCallback(
    (extra: CallLogLinkFilters) => {
      router.push(buildStoreCallsLogHref({ ...base, ...extra }, dashboardBase));
    },
    [router, base, dashboardBase],
  );

  const href = useCallback(
    (extra: CallLogLinkFilters) =>
      buildStoreCallsLogHref({ ...base, ...extra }, dashboardBase),
    [base, dashboardBase],
  );

  return { navigate, href, base };
}

function resolveSegmentFilters(
  kind: SegmentChartKind,
  label: string,
): CallLogLinkFilters {
  switch (kind) {
    case "customerType":
      return { segment: segmentFromCustomerTypeLabel(label) };
    case "purchaseStatus":
      return { segment: segmentFromPurchaseStatusLabel(label) };
    case "valueTier":
      return { valueTier: valueTierFromLabel(label) };
    case "intent":
      return { intentTier: intentTierFromLabel(label) };
  }
}

interface StoreCallsOverviewSectionProps {
  copy: CallsOverviewCopy;
  period: PeriodValue;
  periodLabel: string;
  deltaPeriod: string;
  storeId: string;
  logDashboardBase?: string;
  initialData?: import("@/types").StoreCallAnalytics;
  initialParams?: import("@/types").GetAnalyticsParams;
}

export function StoreCallsOverviewSection({
  copy,
  period,
  periodLabel,
  deltaPeriod,
  storeId,
  logDashboardBase,
  initialData,
  initialParams,
}: StoreCallsOverviewSectionProps) {
  const { data, isLoading, isError, refetch } = useStoreCallAnalytics(
    {
      period,
      storeId: storeId || undefined,
    },
    { initialData, initialParams },
  );
  const title = copy.title.replace("{period}", periodLabel);

  return (
    <DashboardCollapsibleSection title={title} subtitle={copy.subtitle}>
      <QueryLoadState
        isLoading={isLoading}
        isError={isError}
        errorLabel={copy.error}
        retryLabel={copy.retry}
        onRetry={() => void refetch()}
        skeletonCount={4}
      >
        {!data || data.summary.totalCalls === 0 ? (
          <EmptyState message={copy.empty} />
        ) : (
          <StoreCallsOverviewContent
            copy={copy}
            data={data}
            storeId={storeId}
            deltaPeriod={deltaPeriod}
            periodLabel={periodLabel}
            logDashboardBase={logDashboardBase}
          />
        )}
      </QueryLoadState>
    </DashboardCollapsibleSection>
  );
}

function StoreCallsOverviewContent({
  copy,
  data,
  storeId,
  deltaPeriod,
  periodLabel,
  logDashboardBase,
}: {
  copy: CallsOverviewCopy;
  data: StoreCallAnalytics;
  storeId: string;
  deltaPeriod: string;
  periodLabel: string;
  logDashboardBase?: string;
}) {
  const { summary, deltas } = data;
  const { navigate, href } = useCallLogNavigation(
    data.periodRange,
    storeId,
    logDashboardBase,
  );
  const allCallsHref = href({});

  return (
    <Tabs defaultValue="overview" className="min-w-0 space-y-5">
      <div className="space-y-3 rounded-lg border border-border bg-surface-secondary/40 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList
            className={`h-auto w-full min-w-0 justify-start overflow-x-auto bg-surface-secondary sm:w-auto ${TABS_LIST_SCROLL_CLASS}`}
          >
            <TabsTrigger value="overview">{copy.tabs.overview}</TabsTrigger>
            <TabsTrigger value="segments">{copy.tabs.segments}</TabsTrigger>
            <TabsTrigger value="team">{copy.tabs.team}</TabsTrigger>
            <TabsTrigger value="notes">{copy.tabs.notes}</TabsTrigger>
          </TabsList>
          <Link
            href={allCallsHref}
            className="shrink-0 text-sm font-medium text-brand-gold hover:underline"
          >
            {copy.viewInLog} →
          </Link>
        </div>
        <p className="text-xs text-text-muted">{copy.viewInLogHint}</p>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <CallKpiGrid copy={copy} summary={summary} deltas={deltas} deltaPeriod={deltaPeriod} />
        <CallHighlights copy={copy} highlights={data.highlights} href={href} />
      </TabsContent>

      <TabsContent value="segments" className="space-y-4">
        <div className={CHART_GRID_CLASS}>
          <SegmentBreakdownChart
            title={copy.charts.byCustomerType}
            rows={data.byCustomerType}
            kind="customerType"
            onBarClick={(label) => navigate(resolveSegmentFilters("customerType", label))}
          />
          <SegmentBreakdownChart
            title={copy.charts.byPurchaseStatus}
            rows={data.byPurchaseStatus}
            kind="purchaseStatus"
            onBarClick={(label) => navigate(resolveSegmentFilters("purchaseStatus", label))}
          />
          <SegmentBreakdownChart
            title={copy.charts.byValueTier}
            rows={data.byValueTier}
            kind="valueTier"
            onBarClick={(label) => navigate(resolveSegmentFilters("valueTier", label))}
          />
          <SegmentBreakdownChart
            title={copy.charts.byIntent}
            rows={data.byIntentTier}
            kind="intent"
            onBarClick={(label) => navigate(resolveSegmentFilters("intent", label))}
          />
        </div>
      </TabsContent>

      <TabsContent value="team" className="space-y-6">
        {data.staffBreakdown.length > 0 && (
          <div className={CHART_GRID_CLASS}>
            <StaffVolumeChart
              copy={copy}
              rows={data.staffBreakdown}
              onBarClick={(staffId) => navigate({ staffId })}
            />
            <StaffOutcomeChart
              copy={copy}
              rows={data.staffBreakdown}
              onBarClick={(staffId) => navigate({ staffId })}
            />
          </div>
        )}
        <StaffCallTable
          copy={copy}
          rows={data.staffBreakdown}
          periodLabel={periodLabel}
          onStaffClick={(staffId) => navigate({ staffId })}
        />
      </TabsContent>

      <TabsContent value="notes">
        <NotesInsightsPanel copy={copy.notes} insights={data.notesInsights} />
      </TabsContent>
    </Tabs>
  );
}

function CallKpiGrid({
  copy,
  summary,
  deltas,
  deltaPeriod,
}: {
  copy: CallsOverviewCopy;
  summary: StoreCallAnalytics["summary"];
  deltas: StoreCallAnalytics["deltas"];
  deltaPeriod: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 [&>*]:min-w-0">
        <KPICard
          label={copy.kpis.totalCalls}
          value={summary.totalCalls}
          delta={deltas.totalCalls}
          deltaPeriod={deltaPeriod}
          icon={<Phone className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.answered}
          value={summary.answered}
          delta={deltas.answered}
          deltaPeriod={deltaPeriod}
          icon={<Phone className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.notAnswered}
          value={summary.notAnswered}
          delta={deltas.notAnswered}
          deltaPeriod={deltaPeriod}
          icon={<PhoneOff className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.callToConversion}
          value={summary.callToConversionPercent}
          unit="%"
          delta={deltas.callToConversionPercent}
          deltaPeriod={deltaPeriod}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.storeVisitsFromCalls}
          value={summary.storeVisitsFromCalls}
          delta={deltas.storeVisitsFromCalls}
          deltaPeriod={deltaPeriod}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.storeVisitsFromCallsConversion}
          value={summary.storeVisitsFromCallsConversionPercent}
          unit="%"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.coverage}
          value={summary.coverageRatePercent}
          unit="%"
          delta={deltas.coverageRatePercent}
          deltaPeriod={deltaPeriod}
          icon={<PhoneCall className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.activeStaff}
          value={summary.activeStaffCount}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.avgCallsPerStaff}
          value={summary.avgCallsPerStaff}
        />
        <KPICard
          label={copy.kpis.feedbackRate}
          value={summary.feedbackRatePercent}
          unit="%"
        />
      </div>
    </div>
  );
}

function CallHighlights({
  copy,
  highlights,
  href,
}: {
  copy: CallsOverviewCopy;
  highlights: StoreCallAnalytics["highlights"];
  href: (extra: CallLogLinkFilters) => string;
}) {
  if (!highlights.bestAnswerRate && highlights.needsAttention.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {highlights.bestAnswerRate && (
        <HighlightCard
          title={copy.highlights.bestAnswerRate}
          body={`${highlights.bestAnswerRate.staffName} · ${highlights.bestAnswerRate.answerRateLabel}`}
          linkHref={href({ staffId: highlights.bestAnswerRate.staffId })}
        />
      )}
      {highlights.needsAttention.length > 0 && (
        <HighlightCard
          title={copy.highlights.needsAttention}
          body={highlights.needsAttention
            .map((s) => `${s.staffName} (${formatPercent(s.answerRatePercent)})`)
            .join(", ")}
          linkHref={href({ staffId: highlights.needsAttention[0]!.staffId })}
        />
      )}
    </div>
  );
}

function SegmentBreakdownChart({
  title,
  rows,
  kind,
  onBarClick,
}: {
  title: string;
  rows: StoreCallBreakdownRow[];
  kind: SegmentChartKind;
  onBarClick: (label: string) => void;
}) {
  const categoryWidth = useChartCategoryAxisWidth(110, 76);
  if (rows.length === 0) return null;

  function handleBarClick(row: StoreCallBreakdownRow | undefined) {
    if (!row?.label) return;
    const filters = resolveSegmentFilters(kind, row.label);
    const hasFilter = filters.segment || filters.valueTier || filters.intentTier;
    if (hasFilter) onBarClick(row.label);
  }

  return (
    <Card className={CHART_CARD_CLASS}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Click a bar to view matching call records</CardDescription>
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>
        <ChartContainer config={volumeChartConfig} className="h-[220px] w-full cursor-pointer">
          <BarChart data={rows} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" fontSize={10} fontFamily={NUMERIC_FONT_FAMILY} />
            <YAxis
              type="category"
              dataKey="label"
              width={categoryWidth}
              fontSize={10}
              tickLine={false}
              tickFormatter={(value: string) => truncateChartLabel(value)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="answered"
              stackId="segment"
              fill="var(--color-answered)"
              onClick={(barData) =>
                handleBarClick(
                  (barData as { payload?: StoreCallBreakdownRow }).payload,
                )
              }
            />
            <Bar
              dataKey="notAnswered"
              stackId="segment"
              fill="var(--color-notAnswered)"
              radius={[0, 4, 4, 0]}
              onClick={(barData) =>
                handleBarClick(
                  (barData as { payload?: StoreCallBreakdownRow }).payload,
                )
              }
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function StaffVolumeChart({
  copy,
  rows,
  onBarClick,
}: {
  copy: CallsOverviewCopy;
  rows: StoreCallAnalytics["staffBreakdown"];
  onBarClick: (staffId: string) => void;
}) {
  const categoryWidth = useChartCategoryAxisWidth(100, 72);

  return (
    <Card className={CHART_CARD_CLASS}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base">{copy.charts.staffVolume}</CardTitle>
        <CardDescription>{copy.charts.staffVolumeHint}</CardDescription>
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>
        <ChartContainer config={attemptChartConfig} className="h-[260px] w-full cursor-pointer">
          <BarChart data={rows} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" fontSize={10} fontFamily={NUMERIC_FONT_FAMILY} />
            <YAxis
              type="category"
              dataKey="staffName"
              width={categoryWidth}
              fontSize={10}
              tickLine={false}
              tickFormatter={(value: string) => truncateChartLabel(value, 12)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar
              dataKey="totalCalls"
              fill="var(--color-visitCount)"
              radius={[0, 4, 4, 0]}
              onClick={(barData) => {
                const staffId = (barData as { payload?: { staffId?: string } }).payload
                  ?.staffId;
                if (staffId) onBarClick(staffId);
              }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function StaffOutcomeChart({
  copy,
  rows,
  onBarClick,
}: {
  copy: CallsOverviewCopy;
  rows: StoreCallAnalytics["staffBreakdown"];
  onBarClick: (staffId: string) => void;
}) {
  const categoryWidth = useChartCategoryAxisWidth(100, 72);

  function handleBarClick(barData: { payload?: { staffId?: string } } | undefined) {
    const staffId = barData?.payload?.staffId;
    if (staffId) onBarClick(staffId);
  }

  return (
    <Card className={CHART_CARD_CLASS}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base">{copy.charts.staffOutcome}</CardTitle>
        <CardDescription>{copy.charts.staffOutcomeHint}</CardDescription>
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>
        <ChartContainer config={volumeChartConfig} className="h-[260px] w-full cursor-pointer">
          <BarChart data={rows} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" fontSize={10} fontFamily={NUMERIC_FONT_FAMILY} />
            <YAxis
              type="category"
              dataKey="staffName"
              width={categoryWidth}
              fontSize={10}
              tickLine={false}
              tickFormatter={(value: string) => truncateChartLabel(value, 12)}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="answered"
              stackId="staff"
              fill="var(--color-answered)"
              onClick={(barData) => handleBarClick(barData as { payload?: { staffId?: string } })}
            />
            <Bar
              dataKey="notAnswered"
              stackId="staff"
              fill="var(--color-notAnswered)"
              radius={[0, 4, 4, 0]}
              onClick={(barData) => handleBarClick(barData as { payload?: { staffId?: string } })}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function HighlightCard({
  title,
  body,
  linkHref,
}: {
  title: string;
  body: string;
  linkHref?: string;
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-text-muted">{title}</p>
      <p className="mt-1 font-medium text-text-primary">{body}</p>
    </>
  );

  if (!linkHref) {
    return (
      <div className="rounded-lg border border-border bg-surface-secondary/50 px-4 py-3 text-sm">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={linkHref}
      className="block rounded-lg border border-border bg-surface-secondary/50 px-4 py-3 text-sm transition-colors hover:border-brand-gold/50 hover:bg-surface-secondary"
    >
      {content}
    </Link>
  );
}

function StaffCallTable({
  copy,
  rows,
  periodLabel,
  onStaffClick,
}: {
  copy: CallsOverviewCopy;
  rows: StoreCallAnalytics["staffBreakdown"];
  periodLabel: string;
  onStaffClick: (staffId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-col gap-3 border-b border-border bg-surface-secondary/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-base font-semibold text-text-primary">
          {copy.table.title}
        </h3>
        <ExportButton
          label={copy.exportCsv}
          onExport={() =>
            exportStaffCallBreakdownCsv({
              rows,
              headers: copy.table,
              periodLabel,
            })
          }
          disabled={rows.length === 0}
        />
      </div>
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-surface-secondary text-text-secondary">
            <tr>
              {[
                copy.table.staff,
                copy.table.totalCalls,
                copy.table.answered,
                copy.table.notAnswered,
                copy.table.answerRate,
                copy.table.callToConversion,
                copy.table.uniqueVisits,
                copy.table.feedback,
              ].map((label) => (
                <th key={label} className="px-4 py-2 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.staffId}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-secondary/60"
                onClick={() => onStaffClick(row.staffId)}
              >
                <td className="px-4 py-2 font-medium text-brand-gold">{row.staffName}</td>
                <td className="px-4 py-2 font-numeric">{row.totalCalls}</td>
                <td className="px-4 py-2 font-numeric text-status-success">{row.answered}</td>
                <td className="px-4 py-2 font-numeric text-status-error">{row.notAnswered}</td>
                <td className="px-4 py-2 font-numeric">{formatPercent(row.answerRatePercent)}</td>
                <td className="px-4 py-2 font-numeric">
                  {row.answered > 0
                    ? formatPercent(row.callToConversionPercent)
                    : "—"}
                </td>
                <td className="px-4 py-2 font-numeric">{row.uniqueVisitsCalled}</td>
                <td className="px-4 py-2 font-numeric">{row.callsWithFeedback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotesInsightsPanel({
  copy,
  insights,
}: {
  copy: CallsOverviewCopy["notes"];
  insights: StoreCallAnalytics["notesInsights"];
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border p-4 sm:p-5">
      <div>
        <h3 className="text-base font-semibold text-text-primary">{copy.title}</h3>
        <p className="mt-1 text-sm text-text-muted">{copy.subtitle}</p>
      </div>
      <div className="space-y-4">
        {insights.aiSummary ? (
          <div>
            <p className="text-xs font-medium text-text-muted">{copy.aiSummary}</p>
            <p className="mt-1 text-sm text-text-primary">{insights.aiSummary}</p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">
            {insights.aiSummaryAvailable ? copy.aiPending : copy.aiUnavailable}
          </p>
        )}

        {insights.themes.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-muted">{copy.themes}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {insights.themes.map((theme) => (
                <li
                  key={theme.key}
                  className="rounded-full border border-border bg-surface-secondary px-3 py-1 text-xs"
                >
                  {theme.label} ({theme.count})
                </li>
              ))}
            </ul>
          </div>
        )}

        {insights.recentSnippets.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-muted">{copy.recentNotes}</p>
            <ul className="mt-2 space-y-2 text-sm text-text-secondary">
              {insights.recentSnippets.map((note, index) => (
                <li key={index} className="rounded-md border border-border px-3 py-2">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
