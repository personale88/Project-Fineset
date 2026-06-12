"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  MapPin,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { KPICard } from "@/components/analytics/KPICard";
import { ExportButton } from "@/components/shared/ExportButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { DashboardCollapsibleSection } from "@/components/shared/DashboardCollapsibleSection";
import { FieldSalesActionInsights } from "@/components/store/FieldSalesActionInsights";
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
import { useStoreFieldSaleAnalytics } from "@/hooks/useStoreFieldSaleAnalytics";
import { BUSINESS_OWNER_DASHBOARD_PATH } from "@/lib/auth/routes";
import {
  activityTypeFromLabel,
  buildStoreFieldSalesLogHref,
  enrollmentOutcomeFromLabel,
  periodRangeToFieldLogMonth,
  type FieldLogLinkFilters,
} from "@/lib/utils/field-analytics-links";
import { exportFieldStaffBreakdownCsv } from "@/lib/utils/field-staff-export";
import {
  CHART_CARD_CLASS,
  CHART_CARD_CONTENT_CLASS,
  CHART_CARD_HEADER_CLASS,
  CHART_GRID_CLASS,
  formatChartDateTick,
  TABS_LIST_SCROLL_CLASS,
  TIME_SERIES_CHART_MARGIN,
  truncateChartLabel,
  VERTICAL_BAR_CHART_MARGIN,
} from "@/lib/utils/chart-layout";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/utils/formatters";
import { NUMERIC_FONT_FAMILY } from "@/lib/utils/typography";
import { useChartCategoryAxisWidth } from "@/hooks/useChartCategoryAxisWidth";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import type { Content } from "@/content/en";
import type { StoreFieldSaleAnalytics, StoreFieldSaleBreakdownRow } from "@/types";

type FieldSalesOverviewCopy = Content["store"]["fieldSalesOverview"];

const enrolledChartConfig = {
  enrolled: { label: "Enrolled", color: "var(--status-success)" },
  other: { label: "Not enrolled", color: "var(--status-warning)" },
} as const;
const volumeChartConfig = {
  enrolled: { label: "Enrolled", color: "var(--status-success)" },
  interested: { label: "Interested", color: "var(--brand-gold)" },
  followUpNeeded: { label: "Follow-up", color: "var(--status-info)" },
} as const;
const enrollmentTrendConfig = {
  enrollmentRatePercent: { label: "Enrollment rate", color: "var(--brand-gold)" },
} as const;
const visitChartConfig = {
  totalVisits: { label: "Visits", color: "var(--brand-gold)" },
} as const;

type SegmentKind = "activity" | "outcome" | "area" | "customer" | "intent" | "decline";

function useFieldLogNavigation(
  periodRange: StoreFieldSaleAnalytics["periodRange"],
  storeId: string,
  dashboardBase = BUSINESS_OWNER_DASHBOARD_PATH,
) {
  const router = useRouter();
  const base = useMemo(
    () => ({ ...periodRangeToFieldLogMonth(periodRange), storeId }),
    [periodRange, storeId],
  );

  const navigate = useCallback(
    (extra: FieldLogLinkFilters) => {
      router.push(buildStoreFieldSalesLogHref({ ...base, ...extra }, dashboardBase));
    },
    [router, base, dashboardBase],
  );

  const href = useCallback(
    (extra: FieldLogLinkFilters) =>
      buildStoreFieldSalesLogHref({ ...base, ...extra }, dashboardBase),
    [base, dashboardBase],
  );

  return { navigate, href };
}

function resolveSegmentFilters(
  kind: SegmentKind,
  label: string,
): FieldLogLinkFilters {
  switch (kind) {
    case "activity":
      return { activityType: activityTypeFromLabel(label) };
    case "outcome":
      return { enrollmentOutcome: enrollmentOutcomeFromLabel(label) };
    case "area":
      return { search: label === "Unspecified area" ? undefined : label };
    default:
      return {};
  }
}

interface StoreFieldSalesOverviewSectionProps {
  copy: FieldSalesOverviewCopy;
  period: PeriodValue;
  periodLabel: string;
  deltaPeriod: string;
  storeId: string;
  logDashboardBase?: string;
  initialData?: import("@/types").StoreFieldSaleAnalytics;
  initialParams?: import("@/types").GetAnalyticsParams;
}

export function StoreFieldSalesOverviewSection({
  copy,
  period,
  periodLabel,
  deltaPeriod,
  storeId,
  logDashboardBase,
  initialData,
  initialParams,
}: StoreFieldSalesOverviewSectionProps) {
  const { data, isLoading, isError, refetch } = useStoreFieldSaleAnalytics(
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
        {!data || data.summary.totalVisits === 0 ? (
          <EmptyState message={copy.empty} />
        ) : (
          <StoreFieldSalesOverviewContent
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

function StoreFieldSalesOverviewContent({
  copy,
  data,
  storeId,
  deltaPeriod,
  periodLabel,
  logDashboardBase,
}: {
  copy: FieldSalesOverviewCopy;
  data: StoreFieldSaleAnalytics;
  storeId: string;
  deltaPeriod: string;
  periodLabel: string;
  logDashboardBase?: string;
}) {
  const { summary, deltas } = data;
  const { navigate, href } = useFieldLogNavigation(
    data.periodRange,
    storeId,
    logDashboardBase,
  );

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
            href={href({})}
            className="shrink-0 text-sm font-medium text-brand-gold hover:underline"
          >
            {copy.viewInLog} →
          </Link>
        </div>
        <p className="text-xs text-text-muted">{copy.viewInLogHint}</p>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <FieldKpiGrid copy={copy} summary={summary} deltas={deltas} deltaPeriod={deltaPeriod} />
        <FieldHighlights copy={copy} highlights={data.highlights} href={href} />
        <FieldSalesActionInsights
          copy={copy.insights}
          notesCopy={copy.notes}
          data={data}
          deltaPeriod={deltaPeriod}
          onActivityClick={(label) => navigate(resolveSegmentFilters("activity", label))}
        />
        <FieldTrendCharts copy={copy} data={data} />
      </TabsContent>

      <TabsContent value="segments" className="space-y-4">
        <div className={CHART_GRID_CLASS}>
          <SegmentBreakdownChart
            title={copy.charts.byActivityType}
            rows={data.byActivityType}
            kind="activity"
            hint={copy.charts.segmentClickHint}
            onBarClick={(label) => navigate(resolveSegmentFilters("activity", label))}
          />
          <SegmentBreakdownChart
            title={copy.charts.byOutcome}
            rows={data.byEnrollmentOutcome}
            kind="outcome"
            hint={copy.charts.segmentClickHint}
            onBarClick={(label) => navigate(resolveSegmentFilters("outcome", label))}
          />
          <SegmentBreakdownChart
            title={copy.charts.byArea}
            rows={data.byArea}
            kind="area"
            hint={copy.charts.segmentClickHint}
            onBarClick={(label) => navigate(resolveSegmentFilters("area", label))}
          />
          <SegmentBreakdownChart
            title={copy.charts.byCustomerType}
            rows={data.byCustomerType}
            kind="customer"
            hint={copy.charts.segmentClickHint}
            onBarClick={() => {}}
          />
          <SegmentBreakdownChart
            title={copy.charts.byIntent}
            rows={data.byIntentTier}
            kind="intent"
            hint={copy.charts.segmentClickHint}
            onBarClick={() => {}}
          />
          {data.byDeclineReason.length > 0 && (
            <SegmentBreakdownChart
              title={copy.charts.byDeclineReason}
              rows={data.byDeclineReason}
              kind="decline"
              hint={copy.charts.segmentClickHint}
              onBarClick={() => {}}
            />
          )}
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
        <StaffFieldTable
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

function FieldKpiGrid({
  copy,
  summary,
  deltas,
  deltaPeriod,
}: {
  copy: FieldSalesOverviewCopy;
  summary: StoreFieldSaleAnalytics["summary"];
  deltas: StoreFieldSaleAnalytics["deltas"];
  deltaPeriod: string;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4 [&>*]:min-w-0">
        <KPICard
          label={copy.kpis.enrollmentRate}
          value={summary.enrollmentRatePercent}
          unit="%"
          delta={deltas.enrollmentRatePercent}
          deltaPeriod={deltaPeriod}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.totalVisits}
          value={summary.totalVisits}
          delta={deltas.totalVisits}
          deltaPeriod={deltaPeriod}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.enrolled}
          value={summary.enrolled}
          delta={deltas.enrolled}
          deltaPeriod={deltaPeriod}
          icon={<Sparkles className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.uniqueAreas}
          value={summary.uniqueAreas}
          icon={<MapPin className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.followUpRequired}
          value={summary.followUpRequired}
          delta={deltas.followUpRequired}
          deltaPeriod={deltaPeriod}
          icon={<Target className="h-4 w-4" />}
        />
        <KPICard
          label={copy.kpis.followUpConversion}
          value={summary.followUpConversionPercent}
          unit="%"
        />
        <KPICard
          label={copy.kpis.interested}
          value={summary.interested}
        />
        <KPICard
          label={copy.kpis.declined}
          value={summary.declined}
        />
      </div>
    </div>
  );
}

function FieldHighlights({
  copy,
  highlights,
  href,
}: {
  copy: FieldSalesOverviewCopy;
  highlights: StoreFieldSaleAnalytics["highlights"];
  href: (extra: FieldLogLinkFilters) => string;
}) {
  if (!highlights.bestEnrollmentRate && highlights.needsAttention.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {highlights.bestEnrollmentRate && (
        <HighlightCard
          title={copy.highlights.bestEnrollmentRate}
          body={`${highlights.bestEnrollmentRate.staffName} · ${highlights.bestEnrollmentRate.enrollmentRateLabel}`}
          linkHref={href({ staffId: highlights.bestEnrollmentRate.staffId })}
        />
      )}
      {highlights.needsAttention.length > 0 && (
        <HighlightCard
          title={copy.highlights.needsAttention}
          body={highlights.needsAttention
            .map((s) => `${s.staffName} (${formatPercent(s.enrollmentRatePercent)})`)
            .join(", ")}
          linkHref={href({ staffId: highlights.needsAttention[0]!.staffId })}
        />
      )}
    </div>
  );
}

function FieldTrendCharts({
  copy,
  data,
}: {
  copy: FieldSalesOverviewCopy;
  data: StoreFieldSaleAnalytics;
}) {
  const { summary } = data;
  const otherOutcomes = Math.max(
    0,
    summary.totalVisits - summary.enrolled - summary.interested - summary.declined,
  );
  const outcomePie = [
    { name: "enrolled", value: summary.enrolled, fill: "var(--color-enrolled)" },
    { name: "interested", value: summary.interested, fill: "var(--color-interested)" },
    { name: "declined", value: summary.declined, fill: "var(--status-error)" },
    { name: "other", value: otherOutcomes, fill: "var(--color-other)" },
  ].filter((s) => s.value > 0);

  const pieConfig = {
    enrolled: { label: "Enrolled", color: "var(--status-success)" },
    interested: { label: "Interested", color: "var(--brand-gold)" },
    declined: { label: "Declined", color: "var(--status-error)" },
    other: { label: "Pending", color: "var(--text-muted)" },
  };

  return (
    <div className={CHART_GRID_CLASS}>
      <Card className={CHART_CARD_CLASS}>
        <CardHeader className={CHART_CARD_HEADER_CLASS}>
          <CardTitle className="text-base">{copy.charts.outcomeSplit}</CardTitle>
          <CardDescription>{copy.charts.outcomeSplitHint}</CardDescription>
        </CardHeader>
        <CardContent className={CHART_CARD_CONTENT_CLASS}>
          <ChartContainer config={pieConfig} className="mx-auto h-[220px] max-h-[220px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={outcomePie}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
              >
                {outcomePie.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className={CHART_CARD_CLASS}>
        <CardHeader className={CHART_CARD_HEADER_CLASS}>
          <CardTitle className="text-base">{copy.charts.enrollmentTrend}</CardTitle>
          <CardDescription>{copy.charts.enrollmentTrendHint}</CardDescription>
        </CardHeader>
        <CardContent className={CHART_CARD_CONTENT_CLASS}>
          <ChartContainer config={enrollmentTrendConfig} className="h-[220px] w-full">
            <LineChart data={data.dailyTrend} margin={TIME_SERIES_CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDateTick}
                fontSize={10}
                fontFamily={NUMERIC_FONT_FAMILY}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                fontSize={10}
                width={36}
                fontFamily={NUMERIC_FONT_FAMILY}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                type="monotone"
                dataKey="enrollmentRatePercent"
                stroke="var(--color-enrollmentRatePercent)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card
        className={cn(
          CHART_CARD_CLASS,
          data.followUpStatus.length === 0 && "lg:col-span-2",
        )}
      >
        <CardHeader className={CHART_CARD_HEADER_CLASS}>
          <CardTitle className="text-base">{copy.charts.dailyVolume}</CardTitle>
          <CardDescription>{copy.charts.dailyVolumeHint}</CardDescription>
        </CardHeader>
        <CardContent className={CHART_CARD_CONTENT_CLASS}>
          <ChartContainer config={volumeChartConfig} className="h-[240px] w-full">
            <BarChart data={data.dailyTrend} margin={TIME_SERIES_CHART_MARGIN}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatChartDateTick}
                fontSize={10}
                fontFamily={NUMERIC_FONT_FAMILY}
                interval="preserveStartEnd"
              />
              <YAxis fontSize={10} width={28} fontFamily={NUMERIC_FONT_FAMILY} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="enrolled" stackId="day" fill="var(--color-enrolled)" />
              <Bar dataKey="interested" stackId="day" fill="var(--color-interested)" />
              <Bar
                dataKey="followUpNeeded"
                stackId="day"
                fill="var(--color-followUpNeeded)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {data.followUpStatus.length > 0 && (
        <FollowUpStatusChart copy={copy} rows={data.followUpStatus} />
      )}
    </div>
  );
}

function FollowUpStatusChart({
  copy,
  rows,
}: {
  copy: FieldSalesOverviewCopy;
  rows: StoreFieldSaleAnalytics["followUpStatus"];
}) {
  const config = {
    count: { label: "Follow-ups", color: "var(--brand-gold)" },
  };

  return (
    <Card className={CHART_CARD_CLASS}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base">{copy.charts.followUpStatus}</CardTitle>
        <CardDescription>{copy.charts.followUpStatusHint}</CardDescription>
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>
        <ChartContainer config={config} className="h-[240px] w-full">
          <BarChart data={rows} margin={TIME_SERIES_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" fontSize={10} interval="preserveStartEnd" />
            <YAxis fontSize={10} width={28} fontFamily={NUMERIC_FONT_FAMILY} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function breakdownChartData(rows: StoreFieldSaleBreakdownRow[]) {
  return rows.map((row) => ({
    ...row,
    other: Math.max(0, row.total - row.enrolled),
  }));
}

function SegmentBreakdownChart({
  title,
  rows,
  kind,
  hint,
  onBarClick,
}: {
  title: string;
  rows: StoreFieldSaleBreakdownRow[];
  kind: SegmentKind;
  hint: string;
  onBarClick: (label: string) => void;
}) {
  const categoryWidth = useChartCategoryAxisWidth(110, 76);
  if (rows.length === 0) return null;

  const chartData = breakdownChartData(rows);
  const clickable = kind === "activity" || kind === "outcome" || kind === "area";

  function handleBarClick(row: StoreFieldSaleBreakdownRow | undefined) {
    if (!row?.label || !clickable) return;
    const filters = resolveSegmentFilters(kind, row.label);
    const hasFilter =
      filters.activityType || filters.enrollmentOutcome || filters.search;
    if (hasFilter) onBarClick(row.label);
  }

  return (
    <Card className={CHART_CARD_CLASS}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base">{title}</CardTitle>
        {clickable && <CardDescription>{hint}</CardDescription>}
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>
        <ChartContainer
          config={enrolledChartConfig}
          className={`h-[220px] w-full ${clickable ? "cursor-pointer" : ""}`}
        >
          <BarChart data={chartData} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
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
              dataKey="enrolled"
              stackId="segment"
              fill="var(--color-enrolled)"
              onClick={(barData) =>
                handleBarClick(
                  (barData as { payload?: StoreFieldSaleBreakdownRow }).payload,
                )
              }
            />
            <Bar
              dataKey="other"
              stackId="segment"
              fill="var(--color-other)"
              radius={[0, 4, 4, 0]}
              onClick={(barData) =>
                handleBarClick(
                  (barData as { payload?: StoreFieldSaleBreakdownRow }).payload,
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
  copy: FieldSalesOverviewCopy;
  rows: StoreFieldSaleAnalytics["staffBreakdown"];
  onBarClick: (staffId: string) => void;
}) {
  const categoryWidth = useChartCategoryAxisWidth(100, 72);
  const chartRows = rows.map((r) => ({ ...r, totalVisits: r.totalVisits }));

  return (
    <Card className={CHART_CARD_CLASS}>
      <CardHeader className={CHART_CARD_HEADER_CLASS}>
        <CardTitle className="text-base">{copy.charts.staffVolume}</CardTitle>
        <CardDescription>{copy.charts.staffVolumeHint}</CardDescription>
      </CardHeader>
      <CardContent className={CHART_CARD_CONTENT_CLASS}>
        <ChartContainer config={visitChartConfig} className="h-[260px] w-full cursor-pointer">
          <BarChart data={chartRows} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
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
              dataKey="totalVisits"
              fill="var(--color-totalVisits)"
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
  copy: FieldSalesOverviewCopy;
  rows: StoreFieldSaleAnalytics["staffBreakdown"];
  onBarClick: (staffId: string) => void;
}) {
  const categoryWidth = useChartCategoryAxisWidth(100, 72);
  const chartRows = rows.map((r) => ({
    ...r,
    notEnrolled: Math.max(0, r.totalVisits - r.enrolled),
  }));

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
        <ChartContainer config={enrolledChartConfig} className="h-[260px] w-full cursor-pointer">
          <BarChart data={chartRows} layout="vertical" margin={VERTICAL_BAR_CHART_MARGIN}>
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
            <Bar dataKey="enrolled" stackId="staff" fill="var(--color-enrolled)" onClick={handleBarClick} />
            <Bar
              dataKey="notEnrolled"
              stackId="staff"
              fill="var(--color-other)"
              radius={[0, 4, 4, 0]}
              onClick={handleBarClick}
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

function StaffFieldTable({
  copy,
  rows,
  periodLabel,
  onStaffClick,
}: {
  copy: FieldSalesOverviewCopy;
  rows: StoreFieldSaleAnalytics["staffBreakdown"];
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
            exportFieldStaffBreakdownCsv({
              rows,
              headers: copy.table,
              periodLabel,
            })
          }
          disabled={rows.length === 0}
        />
      </div>
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-border bg-surface-secondary text-text-secondary">
            <tr>
              {[
                copy.table.staff,
                copy.table.totalVisits,
                copy.table.enrolled,
                copy.table.enrollmentRate,
                copy.table.followUpNeeded,
                copy.table.followUpsConverted,
                copy.table.uniqueAreas,
                copy.table.notes,
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
                <td className="px-4 py-2 font-numeric">{row.totalVisits}</td>
                <td className="px-4 py-2 font-numeric text-status-success">{row.enrolled}</td>
                <td className="px-4 py-2 font-numeric">
                  {formatPercent(row.enrollmentRatePercent)}
                </td>
                <td className="px-4 py-2 font-numeric">{row.followUpNeeded}</td>
                <td className="px-4 py-2 font-numeric">{row.followUpsConverted}</td>
                <td className="px-4 py-2 font-numeric">{row.uniqueAreas}</td>
                <td className="px-4 py-2 font-numeric">{row.visitsWithNotes}</td>
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
  copy: FieldSalesOverviewCopy["notes"];
  insights: StoreFieldSaleAnalytics["notesInsights"];
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
