import type {
  BudgetRange,
  CustomerType,
  FollowUpStatus,
  IntentTier,
  PurchaseStatus,
  SourceChannel,
  StaffRole,
  StoreCategory,
  VisitType,
} from "@prisma/client";

export type {
  BudgetRange,
  CustomerType,
  FollowUpStatus,
  IntentTier,
  PurchaseStatus,
  SourceChannel,
  StaffRole,
  StoreCategory,
  VisitType,
};

export type UserRole = "STAFF" | "STORE_MANAGER" | "BUSINESS_OWNER" | "MASTER_ADMIN";

interface SessionBase {
  userId: string;
  email: string;
}

export interface StaffSession extends SessionBase {
  role: "STAFF";
  staffId: string;
  storeId: string;
  name: string;
  employeeId?: string;
}

export interface StoreSession extends SessionBase {
  role: "STORE_MANAGER";
  storeId: string;
  storeName: string;
}

export interface BusinessOwnerSession extends SessionBase {
  role: "BUSINESS_OWNER";
  storeId: string;
  storeName: string;
}

export interface AdminSession extends SessionBase {
  role: "MASTER_ADMIN";
}

export type AppSession = StaffSession | StoreSession | BusinessOwnerSession | AdminSession;

export type StorePortalSession = StoreSession | BusinessOwnerSession;

export interface SyncState {
  version: string;
  lastChangedAt: string;
  scope: string;
  counts: {
    visits: number;
    fieldSales: number;
    staff: number;
    customers: number;
    followUps: number;
    callLogs: number;
    stores: number;
  };
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  detail?: string;
  details?: unknown;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: ApiErrorResponse,
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

export type AnalyticsPeriodLabel =
  | "yesterday"
  | "today"
  | "week"
  | "month"
  | "last3months"
  | "last6months";

export interface AnalyticsPeriod {
  start: string;
  end: string;
  label: AnalyticsPeriodLabel;
}

export interface StoreKPIs {
  totalVisits: number;
  totalRevenue: number;
  conversionRate: number;
  avgTransaction: number;
  newCustomers: number;
  repeatCustomers: number;
  openFollowUps: number;
}

export interface StoreKPIDeltas {
  totalVisits: number;
  totalRevenue: number;
  conversionRate: number;
  avgTransaction: number;
  newCustomers: number;
  repeatCustomers: number;
}

export interface StorePerformanceDeltas {
  visits: number;
  revenue: number;
  conversionRate: number;
  fieldSales: number;
  userCalls: number;
  avgTicketSize: number;
  schemesEnrolled: number;
}

export interface StorePerformanceRow {
  storeId: string;
  storeName: string;
  category: StoreCategory;
  city: string;
  state: string;
  isActive: boolean;
  storeManagerName: string | null;
  storeManagerPhone: string | null;
  visits: number;
  revenue: number;
  conversionRate: number;
  avgTicketSize: number;
  schemesEnrolled: number;
  staffCount: number;
  fieldSales: number;
  userCalls: number;
  deltas?: StorePerformanceDeltas;
}

export interface AdminDashboardOverview {
  totalStores: number;
  activeStores: number;
  period: AnalyticsPeriodLabel;
  stores: StorePerformanceRow[];
}

export interface StaffPerformanceRow {
  staffId: string;
  staffName: string;
  storeId: string;
  storeName: string;
  visits: number;
  revenue: number;
  conversionRate: number;
  followUpRate: number;
}

export interface RsoPerformanceRow {
  staffId: string;
  staffName: string;
  customersAttended: number;
  purchased: number;
  notPurchased: number;
  schemesEnrolled: number;
  dataEntryScorePercent: number;
  dataEntryScoreLabel: string;
  growthPercent: number;
  growthLabel: string;
  growthTone: "positive" | "negative" | "neutral";
  revenue: number;
  revenueLabel: string;
}

export interface StoreRsoPerformance {
  period: AnalyticsPeriodLabel;
  periodRange: { start: string; end: string };
  rows: RsoPerformanceRow[];
  topPerformer: {
    staffId: string;
    staffName: string;
    salesLabel: string;
    revenueLabel: string;
  } | null;
  mostImproved: {
    staffId: string;
    staffName: string;
    growthLabel: string;
    salesProgressLabel: string;
  } | null;
}

export interface StoreCallBreakdownRow {
  label: string;
  total: number;
  answered: number;
  notAnswered: number;
  answerRatePercent: number;
}

export interface StoreCallStaffRow {
  staffId: string;
  staffName: string;
  totalCalls: number;
  answered: number;
  notAnswered: number;
  answerRatePercent: number;
  callToConversionPercent: number;
  uniqueVisitsCalled: number;
  callsWithFeedback: number;
}

export interface StoreCallAnalyticsSummary {
  totalCalls: number;
  answered: number;
  notAnswered: number;
  answerRatePercent: number;
  activeStaffCount: number;
  avgCallsPerStaff: number;
  callsWithFeedback: number;
  feedbackRatePercent: number;
  avgFeedbackLength: number;
  eligiblePool: number;
  coverageRatePercent: number;
  answeredCallsConverted: number;
  callToConversionPercent: number;
  storeVisitsFromCalls: number;
  storeVisitsFromCallsPurchased: number;
  storeVisitsFromCallsConversionPercent: number;
}

export interface StoreCallAnalyticsDeltas {
  totalCalls: number;
  answered: number;
  notAnswered: number;
  answerRatePercent: number;
  coverageRatePercent: number;
  callToConversionPercent: number;
  storeVisitsFromCalls: number;
}

export interface StoreCallAnalytics {
  period: AnalyticsPeriodLabel;
  periodRange: { start: string; end: string };
  summary: StoreCallAnalyticsSummary;
  deltas: StoreCallAnalyticsDeltas;
  staffBreakdown: StoreCallStaffRow[];
  byCustomerType: StoreCallBreakdownRow[];
  byPurchaseStatus: StoreCallBreakdownRow[];
  byValueTier: StoreCallBreakdownRow[];
  byIntentTier: StoreCallBreakdownRow[];
  notesInsights: {
    themes: Array<{ key: string; label: string; count: number }>;
    recentSnippets: string[];
    aiSummary: string | null;
    aiSummaryAvailable: boolean;
  };
  highlights: {
    bestAnswerRate: {
      staffId: string;
      staffName: string;
      answerRatePercent: number;
      answerRateLabel: string;
    } | null;
    needsAttention: Array<{
      staffId: string;
      staffName: string;
      notAnswered: number;
      answerRatePercent: number;
    }>;
  };
}

export interface StoreFieldSaleBreakdownRow {
  label: string;
  total: number;
  enrolled: number;
  followUpNeeded: number;
  enrollmentRatePercent: number;
}

export interface StoreFieldSaleStaffRow {
  staffId: string;
  staffName: string;
  totalVisits: number;
  enrolled: number;
  enrollmentRatePercent: number;
  followUpNeeded: number;
  followUpsConverted: number;
  uniqueAreas: number;
  visitsWithNotes: number;
}

export interface StoreFieldSaleAnalyticsSummary {
  totalVisits: number;
  uniqueAreas: number;
  enrolled: number;
  enrollmentRatePercent: number;
  interested: number;
  declined: number;
  followUpRequired: number;
  convertedFollowUps: number;
  followUpConversionPercent: number;
}

export interface StoreFieldSaleAnalyticsDeltas {
  totalVisits: number;
  enrolled: number;
  enrollmentRatePercent: number;
  followUpRequired: number;
  followUpConversionPercent: number;
}

export interface StoreFieldSaleAnalytics {
  period: AnalyticsPeriodLabel;
  periodRange: { start: string; end: string };
  summary: StoreFieldSaleAnalyticsSummary;
  deltas: StoreFieldSaleAnalyticsDeltas;
  staffBreakdown: StoreFieldSaleStaffRow[];
  dailyTrend: Array<{
    date: string;
    total: number;
    enrolled: number;
    followUpNeeded: number;
    interested: number;
    declined: number;
    enrollmentRatePercent: number;
  }>;
  byActivityType: StoreFieldSaleBreakdownRow[];
  byEnrollmentOutcome: StoreFieldSaleBreakdownRow[];
  byCustomerType: StoreFieldSaleBreakdownRow[];
  byIntentTier: StoreFieldSaleBreakdownRow[];
  byDeclineReason: StoreFieldSaleBreakdownRow[];
  byArea: StoreFieldSaleBreakdownRow[];
  followUpStatus: Array<{ label: string; status: string; count: number }>;
  notesInsights: {
    themes: Array<{ key: string; label: string; count: number }>;
    recentSnippets: string[];
    aiSummary: string | null;
    aiSummaryAvailable: boolean;
  };
  highlights: {
    bestEnrollmentRate: {
      staffId: string;
      staffName: string;
      enrollmentRatePercent: number;
      enrollmentRateLabel: string;
    } | null;
    needsAttention: Array<{
      staffId: string;
      staffName: string;
      enrollmentRatePercent: number;
    }>;
  };
}

export interface VisitListItem {
  id: string;
  customerId: string | null;
  visitDate: string;
  inTime: string | null;
  outTime: string | null;
  durationMins: number | null;
  staffName: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  visitType: VisitType;
  sourceChannel: SourceChannel;
  area: string | null;
  address: string | null;
  profession: string | null;
  gender: string | null;
  ageGroup: string | null;
  dateOfBirth: string | null;
  anniversary: string | null;
  purchaseStatus: PurchaseStatus;
  productsExplored: string[];
  productsPurchased: string[];
  transactionAmount: number | null;
  intentTier: IntentTier | null;
  reasonNoPurchase: string | null;
  competitorMention: string | null;
  purchaseOccasion: string | null;
  metalKtPref: string | null;
  budgetStated: BudgetRange | null;
  schemeEnrolled: boolean;
  ghsPolicy: boolean;
  followUpNeeded: boolean;
  followUpDate: string | null;
  staffNotes: string | null;
  followUpStatus: FollowUpStatus | null;
}

export interface FollowUpListItem {
  id: string;
  visitId: string | null;
  customerName: string;
  customerPhone: string;
  assignedStaffName: string;
  followUpDate: string;
  reason: string | null;
  callOutcome: string | null;
  status: FollowUpStatus;
}

export type StaffCallSegment =
  | "ALL"
  | "NEW"
  | "RETAINED"
  | "PURCHASED"
  | "NOT_PURCHASED";

export type StaffCallValueTier = "ALL" | "HIGH" | "MID" | "LOW";

export type StaffCallQueue = "ALL" | "RETENTION" | "FOLLOW_UP" | "NOT_ANSWERED";

export type StaffCallOccasionFilter = "ALL" | "THIS_MONTH";

export type StaffCallMasterSource = "STORE_VISIT" | "FIELD_SALE" | "EXTERNAL";

export type StaffCallMasterFilter = "ALL" | StaffCallMasterSource;

export type CallAnswerStatus = "ANSWERED" | "NOT_ANSWERED";

export interface StaffCallListItem {
  recordId: string;
  masterSource: StaffCallMasterSource;
  visitId: string | null;
  fieldSaleId: string | null;
  followUpId: string | null;
  displayName: string;
  visitDate: string;
  visitDateLabel: string;
  customerType: CustomerType;
  purchaseStatus: PurchaseStatus;
  valueTier: Exclude<StaffCallValueTier, "ALL">;
  visitSummary: string;
  queue: Exclude<StaffCallQueue, "ALL">;
  followUpDueDate: string | null;
  lastCallStatus: CallAnswerStatus | null;
  notes: string | null;
  canCall: boolean;
}

export interface StaffCallFilterCounts {
  masters: Array<{ key: StaffCallMasterFilter; count: number }>;
  segments: Array<{ key: StaffCallSegment; count: number }>;
  valueTiers: Array<{ key: StaffCallValueTier; count: number }>;
  queues: Array<{ key: StaffCallQueue; count: number }>;
  birthdays: Array<{ key: StaffCallOccasionFilter; count: number }>;
  anniversaries: Array<{ key: StaffCallOccasionFilter; count: number }>;
  months: Array<{ month: number; count: number }>;
  availableYears: number[];
}

export interface StaffCallListResponse {
  data: StaffCallListItem[];
  total: number;
  page: number;
  pageSize: number;
  year: number;
  month: number;
  /** Loaded separately via /api/staff/calls/filters to keep list responses fast. */
  filters?: StaffCallFilterCounts;
}

export interface StaffCallDialResult {
  recordId: string;
  masterSource: StaffCallMasterSource;
  visitId: string | null;
  fieldSaleId: string | null;
  displayName: string;
  phone: string;
  dialUrl: string;
}

export interface StaffCallOutcomeResult {
  recordId: string;
  masterSource: StaffCallMasterSource;
  visitId: string | null;
  fieldSaleId: string | null;
  followUpId: string | null;
  queue: StaffCallQueue;
  message: string;
}

export interface GetStaffCallsParams {
  storeId?: string;
  segment?: StaffCallSegment;
  valueTier?: StaffCallValueTier;
  queue?: StaffCallQueue;
  master?: StaffCallMasterFilter;
  birthday?: StaffCallOccasionFilter;
  anniversary?: StaffCallOccasionFilter;
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
}

export interface PortalCallListItem {
  visitId: string;
  followUpId: string | null;
  customerName: string;
  customerPhone: string;
  staffId: string;
  staffName: string;
  storeId: string;
  storeName: string;
  visitDate: string;
  visitDateLabel: string;
  customerType: CustomerType;
  purchaseStatus: PurchaseStatus;
  valueTier: Exclude<StaffCallValueTier, "ALL">;
  visitSummary: string;
  queue: Exclude<StaffCallQueue, "ALL">;
  followUpDueDate: string | null;
  lastCallStatus: CallAnswerStatus | null;
  notes: string | null;
}

export interface PortalCallListResponse {
  data: PortalCallListItem[];
  total: number;
  page: number;
  pageSize: number;
  year: number;
  month: number;
  filters: StaffCallFilterCounts;
}

export interface GetPortalCallsParams {
  segment?: StaffCallSegment;
  valueTier?: StaffCallValueTier;
  queue?: StaffCallQueue;
  year?: number;
  month?: number;
  page?: number;
  pageSize?: number;
  storeId?: string;
  staffId?: string;
  search?: string;
  intentTier?: IntentTier;
}

export interface FieldSaleListItem {
  id: string;
  activityDate: string;
  activityDateLabel: string;
  staffId: string;
  staffName: string;
  storeId: string;
  storeName: string;
  customerName: string;
  customerPhone: string;
  customerType: CustomerType;
  activityType: string;
  locationLabel: string | null;
  schemesPitched: string[];
  enrollmentOutcome: string | null;
  monthlyCommitment: number | null;
  intentTier: string | null;
  reasonNoEnrollment: string | null;
  followUpNeeded: boolean;
  followUpDate: string | null;
  staffNotes: string | null;
}

export interface FieldSaleListFilters {
  months: Array<{ month: number; count: number }>;
  availableYears: number[];
}

export interface FieldSaleListResponse {
  data: FieldSaleListItem[];
  total: number;
  page: number;
  pageSize: number;
  year: number;
  month: number;
  filters: FieldSaleListFilters;
}

export interface GetFieldSalesListParams {
  page?: number;
  pageSize?: number;
  year?: number;
  month?: number;
  storeId?: string;
  staffId?: string;
  search?: string;
  enrollmentOutcome?: string;
  activityType?: string;
}

export interface StoreDetailAnalytics {
  store: {
    id: string;
    name: string;
    category: StoreCategory;
    city: string;
    state: string;
    isActive: boolean;
  };
  kpis: StoreKPIs;
  kpiDeltas: StoreKPIDeltas;
  visitsByDay: Array<{ date: string; visits: number; revenue: number }>;
  sourceBreakdown: Array<{ channel: SourceChannel; count: number }>;
  purchaseStatusBreakdown: Array<{ status: PurchaseStatus; count: number }>;
  noPurchaseReasons: Array<{ reason: string; count: number }>;
}

export interface AnalyticsData {
  kpis: StoreKPIs;
  kpiDeltas?: StoreKPIDeltas;
  visitsByDay?: Array<{ date: string; visits: number; revenue: number }>;
  sourceBreakdown?: Array<{ channel: SourceChannel; count: number }>;
  purchaseStatusBreakdown?: Array<{ status: PurchaseStatus; count: number }>;
  noPurchaseReasons?: Array<{ reason: string; count: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GetVisitsParams {
  page?: string;
  pageSize?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  followUpOnly?: string;
  storeId?: string;
  staffId?: string;
  purchaseStatus?: string;
  visitType?: string;
  customerType?: string;
  sourceChannel?: string;
}

export interface StoreManagerPortfolio {
  period: AnalyticsPeriodLabel;
  stores: StorePerformanceRow[];
}

export type VisitsColumnFilters = {
  staffId?: string;
  purchaseStatus?: string;
  visitType?: string;
  customerType?: string;
  sourceChannel?: string;
};

export interface GetAnalyticsParams {
  period?: AnalyticsPeriodLabel;
  storeId?: string;
}

export interface ManagerStoreOption {
  id: string;
  name: string;
  city: string;
  state: string;
}

export interface MyStoresResponse {
  data: ManagerStoreOption[];
  selectedStoreId: string;
}

export type { ProductCategory } from "@/lib/constants/product-categories";

export type AgeGroup = "18-25" | "26-35" | "36-50" | "50+";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type NoPurchaseReason =
  | "BUDGET"
  | "DESIGN_NOT_LIKED"
  | "EXPLORING"
  | "COMPETITOR"
  | "PAYMENT_ISSUE"
  | "WILL_VISIT_AGAIN";

export type PurchaseOccasion =
  | "WEDDING"
  | "ANNIVERSARY"
  | "GIFT"
  | "SELF"
  | "FESTIVAL";

export type MetalKtPref =
  | "GOLD_14KT"
  | "GOLD_18KT"
  | "GOLD_22KT"
  | "DIAMOND"
  | "SILVER";
