export interface BreakdownRow {
  label: string;
  count: number;
  revenue?: number;
}

export interface StaffBreakdownRow {
  staffId: string;
  label: string;
  visits: number;
  revenue: number;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface AnalyticsAppliedFilter {
  key: string;
  label: string;
  value: string;
}

export interface AdminBusinessAnalyticsFilterOptions {
  stores: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; name: string; storeId: string }>;
  areas: string[];
  segments: FilterOption[];
  valueTiers: FilterOption[];
  customerTypes: FilterOption[];
  intentTiers: FilterOption[];
  purchaseStatuses: FilterOption[];
  visitTypes: FilterOption[];
  sourceChannels: FilterOption[];
  genders: FilterOption[];
  ageGroups: FilterOption[];
  budgetRanges: FilterOption[];
  productCategories: FilterOption[];
  schemeProducts: FilterOption[];
  enrollmentOutcomes: FilterOption[];
}

export interface AnalyticsSummary {
  totalVisits: number;
  totalRevenue: number;
  conversionRate: number;
  uniqueCustomers: number;
  avgTransaction: number;
  fieldSalesCount: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  visits: number;
  revenue: number;
}

export interface ComparisonTrendPoint {
  day: number;
  label: string;
  periodA: { visits: number; revenue: number };
  periodB: { visits: number; revenue: number };
}

export interface AdminBusinessAnalytics {
  dateMode: "preset" | "range" | "day" | "month" | "compare";
  period: { start: string; end: string; label: string };
  summary: AnalyticsSummary;
  trends: AnalyticsTrendPoint[];
  comparison?: {
    period: { start: string; end: string; label: string };
    summary: AnalyticsSummary;
    trends: AnalyticsTrendPoint[];
    comparisonTrends: ComparisonTrendPoint[];
    deltas: {
      totalVisits: number;
      totalRevenue: number;
      conversionRate: number;
      uniqueCustomers: number;
      avgTransaction: number;
      fieldSalesCount: number;
    };
  };
  appliedFilters: AnalyticsAppliedFilter[];
  breakdowns: {
    customerType: BreakdownRow[];
    valueTier: BreakdownRow[];
    intentTier: BreakdownRow[];
    purchaseStatus: BreakdownRow[];
    sourceChannel: BreakdownRow[];
    gender: BreakdownRow[];
    ageGroup: BreakdownRow[];
    area: BreakdownRow[];
    visitType: BreakdownRow[];
    budgetRange: BreakdownRow[];
    productsExplored: BreakdownRow[];
    productsPurchased: BreakdownRow[];
    schemeProduct: BreakdownRow[];
    enrollmentOutcome: BreakdownRow[];
    staff: StaffBreakdownRow[];
  };
  aiInsights: {
    available: boolean;
    summary: string | null;
    recommendations: string[];
  };
}
