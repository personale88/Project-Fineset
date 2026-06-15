import { prisma } from "@/lib/db/prisma";
import {
  computeVisitValueTier,
  matchesCallQueue,
  matchesCallSegment,
  matchesVisitPeriod,
} from "@/lib/services/call-list-utils";
import { EXTERNAL_SOURCE_CHANNELS } from "@/lib/services/staff-call-master";
import {
  shouldQueryFieldSales,
  shouldQueryVisits,
  type StaffCallsDbQueryParams,
} from "@/lib/services/staff-calls-query";
import type {
  StaffCallFilterCounts,
  StaffCallMasterFilter,
  StaffCallOccasionFilter,
  StaffCallQueue,
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";
import type {
  CallValueTier,
  Prisma,
  SchemeEnrollmentOutcome,
  SourceChannel,
} from "@prisma/client";

const ENROLLED_OUTCOMES: SchemeEnrollmentOutcome[] = [
  "ENROLLED_GHS",
  "ENROLLED_GPP",
  "ENROLLED_BOTH",
];

const staffCallVisitCountSelect = {
  staffId: true,
  visitDate: true,
  sourceChannel: true,
  customerType: true,
  purchaseStatus: true,
  callValueTier: true,
  transactionAmount: true,
  budgetStated: true,
  lastCallAnswered: true,
  birthMonth: true,
  anniversaryMonth: true,
  followUp: {
    select: {
      status: true,
      assignedStaffId: true,
    },
  },
} satisfies Prisma.VisitSelect;

const staffCallFieldSaleCountSelect = {
  staffId: true,
  activityDate: true,
  customerType: true,
  enrollmentOutcome: true,
  callValueTier: true,
  monthlyCommitment: true,
  lastCallAnswered: true,
  birthMonth: true,
  anniversaryMonth: true,
  followUp: {
    select: {
      status: true,
      assignedStaffId: true,
    },
  },
} satisfies Prisma.FieldSaleSelect;

export type StaffCallVisitCountRow = Prisma.VisitGetPayload<{
  select: typeof staffCallVisitCountSelect;
}>;

export type StaffCallFieldSaleCountRow = Prisma.FieldSaleGetPayload<{
  select: typeof staffCallFieldSaleCountSelect;
}>;

export interface StaffCallYearRecords {
  visits: StaffCallVisitCountRow[];
  fieldSales: StaffCallFieldSaleCountRow[];
}

function yearBounds(year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, 0, 1),
    end: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export async function fetchStaffCallYearRecords(
  staffId: string,
  storeId: string,
  year: number,
  storeScope = false,
): Promise<StaffCallYearRecords> {
  const { start, end } = yearBounds(year);
  const staffFilter = storeScope ? {} : { staffId };

  const [visits, fieldSales] = await Promise.all([
    prisma.visit.findMany({
      where: {
        ...staffFilter,
        storeId,
        visitDate: { gte: start, lte: end },
      },
      select: staffCallVisitCountSelect,
    }),
    prisma.fieldSale.findMany({
      where: {
        ...staffFilter,
        storeId,
        activityDate: { gte: start, lte: end },
      },
      select: staffCallFieldSaleCountSelect,
    }),
  ]);

  return { visits, fieldSales };
}

function resolveVisitValueTier(visit: StaffCallVisitCountRow): Exclude<StaffCallValueTier, "ALL"> {
  return (visit.callValueTier ?? computeVisitValueTier(visit)) as Exclude<
    StaffCallValueTier,
    "ALL"
  >;
}

function resolveFieldSaleValueTier(
  fieldSale: StaffCallFieldSaleCountRow,
): Exclude<StaffCallValueTier, "ALL"> {
  if (fieldSale.callValueTier) {
    return fieldSale.callValueTier as Exclude<StaffCallValueTier, "ALL">;
  }
  const commitment = fieldSale.monthlyCommitment;
  if (commitment == null) return "LOW";
  if (commitment >= 50_000) return "HIGH";
  if (commitment >= 15_000) return "MID";
  return "LOW";
}

function matchesFieldSaleSegment(
  fieldSale: Pick<StaffCallFieldSaleCountRow, "customerType" | "enrollmentOutcome">,
  segment: StaffCallSegment,
): boolean {
  switch (segment) {
    case "ALL":
      return true;
    case "NEW":
      return fieldSale.customerType === "NEW";
    case "RETAINED":
      return fieldSale.customerType === "REPEAT" || fieldSale.customerType === "VIP";
    case "PURCHASED":
      return (
        fieldSale.enrollmentOutcome != null &&
        ENROLLED_OUTCOMES.includes(fieldSale.enrollmentOutcome)
      );
    case "NOT_PURCHASED":
      return (
        fieldSale.enrollmentOutcome == null ||
        !ENROLLED_OUTCOMES.includes(fieldSale.enrollmentOutcome)
      );
  }
}

function matchesVisitMasterSource(
  sourceChannel: SourceChannel,
  master: StaffCallMasterFilter,
): boolean {
  if (master === "ALL" || master === "FIELD_SALE") return true;
  if (master === "STORE_VISIT") return sourceChannel === "ORGANIC_WALK_IN";
  return EXTERNAL_SOURCE_CHANNELS.includes(sourceChannel);
}

function matchesValueTier(
  storedTier: CallValueTier | null,
  resolvedTier: Exclude<StaffCallValueTier, "ALL">,
  valueTier: StaffCallValueTier,
): boolean {
  if (valueTier === "ALL") return true;
  return (storedTier ?? resolvedTier) === valueTier;
}

function matchesOccasionMonth(
  filter: StaffCallOccasionFilter,
  storedMonth: number | null,
  activeMonth: number,
): boolean {
  if (filter !== "THIS_MONTH") return true;
  return storedMonth === activeMonth;
}

function visitMatchesFilters(
  visit: StaffCallVisitCountRow,
  params: StaffCallsDbQueryParams,
  master: StaffCallMasterFilter,
): boolean {
  if (!shouldQueryVisits(master)) return false;
  if (!matchesVisitMasterSource(visit.sourceChannel, master)) return false;
  if (!matchesVisitPeriod(visit.visitDate, params.year, params.month)) return false;
  if (!matchesCallSegment(visit, params.segment)) return false;
  if (
    !matchesValueTier(visit.callValueTier, resolveVisitValueTier(visit), params.valueTier)
  ) {
    return false;
  }
  if (params.storeScope && params.queue === "FOLLOW_UP") {
    if (visit.followUp?.status !== "OPEN") return false;
  } else if (
    !matchesCallQueue(
      {
        staffId: params.storeScope ? visit.staffId : params.staffId,
        followUp: visit.followUp,
        lastCallAnswered: visit.lastCallAnswered,
        callLogs: [],
      },
      params.queue,
    )
  ) {
    return false;
  }
  if (!matchesOccasionMonth(params.birthday, visit.birthMonth, params.month)) return false;
  if (!matchesOccasionMonth(params.anniversary, visit.anniversaryMonth, params.month)) {
    return false;
  }
  return true;
}

function fieldSaleMatchesFilters(
  fieldSale: StaffCallFieldSaleCountRow,
  params: StaffCallsDbQueryParams,
  master: StaffCallMasterFilter,
): boolean {
  if (!shouldQueryFieldSales(master)) return false;
  if (!matchesVisitPeriod(fieldSale.activityDate, params.year, params.month)) return false;
  if (!matchesFieldSaleSegment(fieldSale, params.segment)) return false;
  if (
    !matchesValueTier(
      fieldSale.callValueTier,
      resolveFieldSaleValueTier(fieldSale),
      params.valueTier,
    )
  ) {
    return false;
  }
  if (params.storeScope && params.queue === "FOLLOW_UP") {
    if (fieldSale.followUp?.status !== "OPEN") return false;
  } else if (
    !matchesCallQueue(
      {
        staffId: params.storeScope ? fieldSale.staffId : params.staffId,
        followUp: fieldSale.followUp,
        lastCallAnswered: fieldSale.lastCallAnswered,
        callLogs: [],
      },
      params.queue,
    )
  ) {
    return false;
  }
  if (!matchesOccasionMonth(params.birthday, fieldSale.birthMonth, params.month)) return false;
  if (!matchesOccasionMonth(params.anniversary, fieldSale.anniversaryMonth, params.month)) {
    return false;
  }
  return true;
}

function countEntityTotalsFromRecords(
  records: StaffCallYearRecords,
  params: StaffCallsDbQueryParams,
  master: StaffCallMasterFilter,
): number {
  let total = 0;
  for (const visit of records.visits) {
    if (visitMatchesFilters(visit, params, master)) total += 1;
  }
  for (const fieldSale of records.fieldSales) {
    if (fieldSaleMatchesFilters(fieldSale, params, master)) total += 1;
  }
  return total;
}

function getAvailableYears(records: StaffCallYearRecords, year: number): number[] {
  const years = new Set<number>([year, new Date().getFullYear()]);
  for (const visit of records.visits) {
    years.add(visit.visitDate.getFullYear());
  }
  for (const fieldSale of records.fieldSales) {
    years.add(fieldSale.activityDate.getFullYear());
  }
  return Array.from(years).sort((a, b) => b - a);
}

export function countMergedStaffCallsFromRecords(
  records: StaffCallYearRecords,
  params: StaffCallsDbQueryParams,
): number {
  return countEntityTotalsFromRecords(records, params, params.master);
}

export function countStaffCallFiltersFromRecords(
  records: StaffCallYearRecords,
  params: {
    staffId: string;
    storeId: string;
    storeScope?: boolean;
    master: StaffCallMasterFilter;
    segment: StaffCallSegment;
    valueTier: StaffCallValueTier;
    queue: StaffCallQueue;
    birthday: StaffCallOccasionFilter;
    anniversary: StaffCallOccasionFilter;
    year: number;
    month: number;
  },
): StaffCallFilterCounts {
  const base: StaffCallsDbQueryParams = {
    staffId: params.staffId,
    storeId: params.storeId,
    storeScope: params.storeScope,
    master: params.master,
    segment: params.segment,
    valueTier: params.valueTier,
    queue: params.queue,
    birthday: params.birthday,
    anniversary: params.anniversary,
    year: params.year,
    month: params.month,
  };

  const masters: StaffCallMasterFilter[] = ["ALL", "STORE_VISIT", "FIELD_SALE", "EXTERNAL"];
  const segments: StaffCallSegment[] = ["ALL", "NEW", "RETAINED", "PURCHASED", "NOT_PURCHASED"];
  const valueTiers: StaffCallValueTier[] = ["ALL", "HIGH", "MID", "LOW"];
  const queues: StaffCallQueue[] = ["ALL", "NOT_ANSWERED", "FOLLOW_UP"];
  const occasions: StaffCallOccasionFilter[] = ["ALL", "THIS_MONTH"];

  return {
    masters: masters.map((master) => ({
      key: master,
      count: countEntityTotalsFromRecords(records, base, master),
    })),
    segments: segments.map((segment) => ({
      key: segment,
      count: countEntityTotalsFromRecords(
        records,
        { ...base, segment },
        params.master,
      ),
    })),
    valueTiers: valueTiers.map((valueTier) => ({
      key: valueTier,
      count: countEntityTotalsFromRecords(
        records,
        { ...base, valueTier },
        params.master,
      ),
    })),
    queues: queues.map((queue) => ({
      key: queue,
      count: countEntityTotalsFromRecords(records, { ...base, queue }, params.master),
    })),
    birthdays: occasions.map((birthday) => ({
      key: birthday,
      count: countEntityTotalsFromRecords(
        records,
        { ...base, birthday },
        params.master,
      ),
    })),
    anniversaries: occasions.map((anniversary) => ({
      key: anniversary,
      count: countEntityTotalsFromRecords(
        records,
        { ...base, anniversary },
        params.master,
      ),
    })),
    months: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return {
        month,
        count: countEntityTotalsFromRecords(
          records,
          { ...base, month },
          params.master,
        ),
      };
    }),
    availableYears: getAvailableYears(records, params.year),
  };
}
