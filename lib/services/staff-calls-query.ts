import { EXTERNAL_SOURCE_CHANNELS } from "@/lib/services/staff-call-master";
import {
  buildCallsPeriodRange,
  buildFieldSaleFollowUpOpenWhere,
  buildFollowUpOpenWhere,
  buildNotAnsweredWhere,
} from "@/lib/services/call-queue-utils";
import type {
  StaffCallMasterFilter,
  StaffCallOccasionFilter,
  StaffCallQueue,
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";
import type { CallValueTier, Prisma, SchemeEnrollmentOutcome } from "@prisma/client";

const ENROLLED_OUTCOMES: SchemeEnrollmentOutcome[] = [
  "ENROLLED_GHS",
  "ENROLLED_GPP",
  "ENROLLED_BOTH",
];

export interface StaffCallsDbQueryParams {
  staffId: string;
  storeId: string;
  /** When true, list all staff records in the store (portal owner/manager view). */
  storeScope?: boolean;
  master: StaffCallMasterFilter;
  segment: StaffCallSegment;
  valueTier: StaffCallValueTier;
  queue: StaffCallQueue;
  birthday: StaffCallOccasionFilter;
  anniversary: StaffCallOccasionFilter;
  year: number;
  month: number;
}

export function buildVisitSegmentWhere(segment: StaffCallSegment): Prisma.VisitWhereInput {
  switch (segment) {
    case "ALL":
      return {};
    case "NEW":
      return { customerType: "NEW" };
    case "RETAINED":
      return { customerType: { in: ["REPEAT", "VIP"] } };
    case "PURCHASED":
      return { purchaseStatus: "PURCHASED" };
    case "NOT_PURCHASED":
      return { purchaseStatus: "NOT_PURCHASED" };
  }
}

function buildFieldSaleSegmentWhere(segment: StaffCallSegment): Prisma.FieldSaleWhereInput {
  switch (segment) {
    case "ALL":
      return {};
    case "NEW":
      return { customerType: "NEW" };
    case "RETAINED":
      return { customerType: { in: ["REPEAT", "VIP"] } };
    case "PURCHASED":
      return { enrollmentOutcome: { in: ENROLLED_OUTCOMES } };
    case "NOT_PURCHASED":
      return {
        OR: [{ enrollmentOutcome: null }, { enrollmentOutcome: { notIn: ENROLLED_OUTCOMES } }],
      };
  }
}

export function buildVisitValueTierWhere(
  valueTier: StaffCallValueTier,
): Prisma.VisitWhereInput {
  if (valueTier === "ALL") return {};
  return { callValueTier: valueTier as CallValueTier };
}

export function buildFieldSaleValueTierWhere(
  valueTier: StaffCallValueTier,
): Prisma.FieldSaleWhereInput {
  if (valueTier === "ALL") return {};
  return { callValueTier: valueTier as CallValueTier };
}

export function buildVisitBirthdayWhere(
  filter: StaffCallOccasionFilter,
  month: number,
): Prisma.VisitWhereInput {
  if (filter !== "THIS_MONTH") return {};
  return { birthMonth: month };
}

export function buildVisitAnniversaryWhere(
  filter: StaffCallOccasionFilter,
  month: number,
): Prisma.VisitWhereInput {
  if (filter !== "THIS_MONTH") return {};
  return { anniversaryMonth: month };
}

export function buildFieldSaleBirthdayWhere(
  filter: StaffCallOccasionFilter,
  month: number,
): Prisma.FieldSaleWhereInput {
  if (filter !== "THIS_MONTH") return {};
  return { birthMonth: month };
}

export function buildFieldSaleAnniversaryWhere(
  filter: StaffCallOccasionFilter,
  month: number,
): Prisma.FieldSaleWhereInput {
  if (filter !== "THIS_MONTH") return {};
  return { anniversaryMonth: month };
}

export function buildVisitQueueWhere(
  queue: StaffCallQueue,
  staffId: string,
  storeScope = false,
): Prisma.VisitWhereInput {
  if (queue === "ALL") return {};
  if (queue === "NOT_ANSWERED") return buildNotAnsweredWhere();
  if (queue === "FOLLOW_UP") {
    return storeScope
      ? { followUp: { status: "OPEN" } }
      : { followUp: buildFollowUpOpenWhere(staffId) };
  }
  return {
    AND: [
      {
        OR: storeScope
          ? [{ followUp: null }, { followUp: { is: { status: { not: "OPEN" } } } }]
          : [
              { followUp: null },
              {
                followUp: {
                  isNot: {
                    status: "OPEN",
                    assignedStaffId: staffId,
                  },
                },
              },
            ],
      },
      {
        OR: [{ lastCallAnswered: null }, { lastCallAnswered: { not: "NOT_ANSWERED" } }],
      },
    ],
  };
}

function buildFieldSaleQueueWhere(
  queue: StaffCallQueue,
  staffId: string,
  storeScope = false,
): Prisma.FieldSaleWhereInput {
  if (queue === "ALL") return {};
  if (queue === "NOT_ANSWERED") return buildNotAnsweredWhere();
  if (queue === "FOLLOW_UP") {
    return storeScope
      ? { followUp: { status: "OPEN" } }
      : { followUp: buildFieldSaleFollowUpOpenWhere(staffId) };
  }
  return {
    AND: [
      {
        OR: storeScope
          ? [{ followUp: null }, { followUp: { is: { status: { not: "OPEN" } } } }]
          : [
              { followUp: null },
              {
                followUp: {
                  isNot: {
                    status: "OPEN",
                    assignedStaffId: staffId,
                  },
                },
              },
            ],
      },
      {
        OR: [{ lastCallAnswered: null }, { lastCallAnswered: { not: "NOT_ANSWERED" } }],
      },
    ],
  };
}

function buildVisitSourceWhere(master: StaffCallMasterFilter): Prisma.VisitWhereInput {
  if (master === "STORE_VISIT") return { sourceChannel: "ORGANIC_WALK_IN" };
  if (master === "EXTERNAL") return { sourceChannel: { in: EXTERNAL_SOURCE_CHANNELS } };
  return {};
}

export function buildVisitListWhere(params: StaffCallsDbQueryParams): Prisma.VisitWhereInput {
  const { start, end } = buildCallsPeriodRange(params.year, params.month);
  return {
    ...(params.storeScope ? {} : { staffId: params.staffId }),
    storeId: params.storeId,
    visitDate: { gte: start, lte: end },
    ...buildVisitSegmentWhere(params.segment),
    ...buildVisitQueueWhere(params.queue, params.staffId, params.storeScope),
    ...buildVisitSourceWhere(params.master),
    ...buildVisitValueTierWhere(params.valueTier),
    ...buildVisitBirthdayWhere(params.birthday, params.month),
    ...buildVisitAnniversaryWhere(params.anniversary, params.month),
  };
}

export function buildFieldSaleListWhere(
  params: StaffCallsDbQueryParams,
): Prisma.FieldSaleWhereInput {
  const { start, end } = buildCallsPeriodRange(params.year, params.month);
  return {
    ...(params.storeScope ? {} : { staffId: params.staffId }),
    storeId: params.storeId,
    activityDate: { gte: start, lte: end },
    ...buildFieldSaleSegmentWhere(params.segment),
    ...buildFieldSaleQueueWhere(params.queue, params.staffId, params.storeScope),
    ...buildFieldSaleValueTierWhere(params.valueTier),
    ...buildFieldSaleBirthdayWhere(params.birthday, params.month),
    ...buildFieldSaleAnniversaryWhere(params.anniversary, params.month),
  };
}

export function shouldQueryVisits(master: StaffCallMasterFilter): boolean {
  return master === "ALL" || master === "STORE_VISIT" || master === "EXTERNAL";
}

export function shouldQueryFieldSales(master: StaffCallMasterFilter): boolean {
  return master === "ALL" || master === "FIELD_SALE";
}

export function buildVisitListWhereForMaster(
  params: StaffCallsDbQueryParams,
  master: StaffCallMasterFilter,
): Prisma.VisitWhereInput {
  return buildVisitListWhere({ ...params, master });
}

export function toStaffCallsDbQueryParams(params: {
  staffId: string;
  storeId: string;
  master: StaffCallMasterFilter;
  segment: StaffCallSegment;
  valueTier: StaffCallValueTier;
  queue: StaffCallQueue;
  birthday: StaffCallOccasionFilter;
  anniversary: StaffCallOccasionFilter;
  year: number;
  month: number;
}): StaffCallsDbQueryParams {
  return params;
}

export { buildCallsPeriodRange };
