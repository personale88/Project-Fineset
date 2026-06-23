import { prisma } from "@/lib/db/prisma";
import { hashPhone } from "@/lib/crypto/pii";
import { phoneDigitsForHash } from "@/lib/import-engine/utils/phoneNormaliser";
import { lookupCustomerByPhone } from "@/lib/services/customers";
import { classifyVisitMasterSource } from "@/lib/services/staff-call-master";
import { resolveStoredValueTier } from "@/lib/services/call-record-denorm";
import {
  countStaffCallFiltersFromRecords,
  fetchStaffCallPendingActionRecords,
  fetchStaffCallYearRecords,
  mergeStaffCallYearRecords,
} from "@/lib/services/staff-calls-filter-counts";
import {
  countMergedStaffCalls,
  fetchMergedStaffCallPageIds,
  type StaffCallPageRef,
} from "@/lib/services/staff-calls-pagination";
import type { StaffCallsDbQueryParams } from "@/lib/services/staff-calls-query";
import {
  buildVisitCallSummary,
  computeVisitValueTier,
  deriveCallQueue,
} from "@/lib/services/call-list-utils";
import { decryptVisitPii } from "@/lib/services/pii";
import { resolveFollowUpAssignee } from "@/lib/utils/follow-up-assignee";
import { notifyPortalDataChangeNow } from "@/lib/sync/notify-change";
import { isFieldSaleEnrolled } from "@/lib/utils/field-enrollment";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type {
  ManualStaffCallInput,
  StaffCallOutcomeInput,
} from "@/lib/validations/staff-calls.schema";
import { createVisit } from "@/lib/services/visits";
import type {
  StaffCallDialResult,
  StaffCallFilterCounts,
  StaffCallListItem,
  StaffCallListResponse,
  StaffCallMasterFilter,
  StaffCallMasterSource,
  StaffCallOccasionFilter,
  StaffCallOutcomeResult,
  StaffCallQueue,
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";
import type {
  CallAnswerStatus,
  Prisma,
  PurchaseStatus,
  SchemeEnrollmentOutcome,
} from "@prisma/client";

interface ListStaffCallsParams {
  staffId: string;
  storeId: string;
  storeScope?: boolean;
  viewStaffId?: string;
  master: StaffCallMasterFilter;
  segment: StaffCallSegment;
  valueTier: StaffCallValueTier;
  queue: StaffCallQueue;
  birthday: StaffCallOccasionFilter;
  anniversary: StaffCallOccasionFilter;
  year: number;
  month: number;
  page: number;
  pageSize: number;
}

interface RecordStaffCallOutcomeParams extends StaffCallOutcomeInput {
  recordId: string;
  masterSource: StaffCallMasterSource;
  staffId: string;
  storeId: string;
  storeScope?: boolean;
}

function recordStaffFilter(staffId: string, storeScope?: boolean) {
  return storeScope ? {} : { staffId };
}

const visitListSelect = (staffId: string, storeScope = false): Prisma.VisitSelect => ({
  id: true,
  staffId: true,
  visitDate: true,
  sourceChannel: true,
  customerName: true,
  customerPhone: true,
  customerType: true,
  purchaseStatus: true,
  productsExplored: true,
  productsPurchased: true,
  transactionAmount: true,
  budgetStated: true,
  intentTier: true,
  reasonNoPurchase: true,
  staffNotes: true,
  dateOfBirth: true,
  anniversary: true,
  lastCallAnswered: true,
  lastCallAt: true,
  callValueTier: true,
  staff: {
    select: {
      id: true,
      name: true,
    },
  },
  customer: {
    select: {
      dateOfBirth: true,
      anniversary: true,
    },
  },
  followUp: {
    select: {
      id: true,
      status: true,
      followUpDate: true,
      assignedStaffId: true,
      notes: true,
    },
  },
  callLogs: {
    ...(storeScope ? {} : { where: { staffId } }),
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      answered: true,
      createdAt: true,
      feedback: true,
    },
  },
});

const fieldSaleListSelect = (staffId: string, storeScope = false): Prisma.FieldSaleSelect => ({
  id: true,
  staffId: true,
  activityDate: true,
  customerName: true,
  customerPhone: true,
  customerType: true,
  monthlyCommitment: true,
  enrollmentOutcome: true,
  activityType: true,
  locationLabel: true,
  staffNotes: true,
  intentTier: true,
  lastCallAnswered: true,
  lastCallAt: true,
  callValueTier: true,
  staff: {
    select: {
      id: true,
      name: true,
    },
  },
  customer: {
    select: {
      dateOfBirth: true,
      anniversary: true,
    },
  },
  followUp: {
    select: {
      id: true,
      status: true,
      followUpDate: true,
      assignedStaffId: true,
      notes: true,
    },
  },
  callLogs: {
    ...(storeScope ? {} : { where: { staffId } }),
    orderBy: { createdAt: "desc" },
    take: 1,
    select: {
      answered: true,
      createdAt: true,
      feedback: true,
    },
  },
});

type VisitRow = Prisma.VisitGetPayload<{ select: ReturnType<typeof visitListSelect> }>;
type FieldSaleRow = Prisma.FieldSaleGetPayload<{
  select: ReturnType<typeof fieldSaleListSelect>;
}>;

type FilterableCallRecord = {
  item: StaffCallListItem;
  activityDate: Date;
  dateOfBirth: Date | null;
  anniversary: Date | null;
  hasOpenFollowUp: boolean;
};

export { computeVisitValueTier } from "@/lib/services/call-list-utils";

function computeFieldSaleValueTier(monthlyCommitment: number | null): Exclude<StaffCallValueTier, "ALL"> {
  if (monthlyCommitment == null) return "LOW";
  if (monthlyCommitment >= 50_000) return "HIGH";
  if (monthlyCommitment >= 15_000) return "MID";
  return "LOW";
}

function deriveFieldSalePurchaseStatus(
  enrollmentOutcome: SchemeEnrollmentOutcome | null,
): PurchaseStatus {
  return isFieldSaleEnrolled(enrollmentOutcome) ? "PURCHASED" : "NOT_PURCHASED";
}

function buildVisitSummary(visit: {
  purchaseStatus: PurchaseStatus;
  productsExplored: string[];
  productsPurchased: string[];
  transactionAmount: number | null;
  reasonNoPurchase: string | null;
}): string {
  return buildVisitCallSummary(visit);
}

function buildFieldSaleSummary(fieldSale: {
  activityType: string;
  locationLabel: string | null;
  monthlyCommitment: number | null;
  enrollmentOutcome: SchemeEnrollmentOutcome | null;
}): string {
  const parts: string[] = [fieldSale.activityType.replace(/_/g, " ").toLowerCase()];
  if (fieldSale.locationLabel) parts.push(fieldSale.locationLabel);
  parts.push(isFieldSaleEnrolled(fieldSale.enrollmentOutcome) ? "Enrolled" : "Not enrolled");
  if (fieldSale.monthlyCommitment != null) parts.push(formatCurrency(fieldSale.monthlyCommitment));
  return parts.join(" · ");
}

function toVisitRecord(
  visit: VisitRow,
  staffId: string,
  storeScope = false,
): FilterableCallRecord {
  const decrypted = decryptVisitPii(visit);
  const valueTier = resolveStoredValueTier(visit.callValueTier, computeVisitValueTier(visit));
  const lastCall = visit.callLogs[0] ?? null;
  const lastCallAnswered = visit.lastCallAnswered ?? lastCall?.answered ?? null;
  const hasOpenFollowUp = storeScope
    ? visit.followUp?.status === "OPEN"
    : visit.followUp?.status === "OPEN" && visit.followUp.assignedStaffId === staffId;
  const queue = deriveCallQueue({
    hasOpenFollowUp,
    lastCallAnswered,
  });
  const notes =
    lastCall?.feedback?.trim() ||
    visit.followUp?.notes?.trim() ||
    visit.staffNotes?.trim() ||
    null;
  const masterSource = classifyVisitMasterSource(visit.sourceChannel);

  return {
    activityDate: visit.visitDate,
    dateOfBirth: visit.dateOfBirth ?? visit.customer?.dateOfBirth ?? null,
    anniversary: visit.anniversary ?? visit.customer?.anniversary ?? null,
    hasOpenFollowUp,
    item: {
      recordId: visit.id,
      masterSource,
      visitId: visit.id,
      fieldSaleId: null,
      followUpId: visit.followUp?.id ?? null,
      staffId: visit.staff.id,
      staffName: visit.staff.name,
      displayName: decrypted.customerName,
      visitDate: visit.visitDate.toISOString(),
      visitDateLabel: formatDate(visit.visitDate),
      customerType: visit.customerType,
      purchaseStatus: visit.purchaseStatus,
      valueTier,
      visitSummary: buildVisitSummary(visit),
      queue,
      followUpDueDate: visit.followUp?.followUpDate.toISOString() ?? null,
      lastCallStatus: lastCallAnswered,
      notes,
      canCall: decrypted.customerPhone.replace(/\D/g, "").length >= 10,
    },
  };
}

function toFieldSaleRecord(
  fieldSale: FieldSaleRow,
  staffId: string,
  storeScope = false,
): FilterableCallRecord {
  const decrypted = decryptVisitPii(fieldSale);
  const purchaseStatus = deriveFieldSalePurchaseStatus(fieldSale.enrollmentOutcome);
  const valueTier = resolveStoredValueTier(
    fieldSale.callValueTier,
    computeFieldSaleValueTier(fieldSale.monthlyCommitment),
  );
  const lastCall = fieldSale.callLogs[0] ?? null;
  const lastCallAnswered = fieldSale.lastCallAnswered ?? lastCall?.answered ?? null;
  const hasOpenFollowUp = storeScope
    ? fieldSale.followUp?.status === "OPEN"
    : fieldSale.followUp?.status === "OPEN" &&
      fieldSale.followUp.assignedStaffId === staffId;
  const queue = deriveCallQueue({
    hasOpenFollowUp,
    lastCallAnswered,
  });
  const notes =
    lastCall?.feedback?.trim() ||
    fieldSale.followUp?.notes?.trim() ||
    fieldSale.staffNotes?.trim() ||
    null;

  return {
    activityDate: fieldSale.activityDate,
    dateOfBirth: fieldSale.customer?.dateOfBirth ?? null,
    anniversary: fieldSale.customer?.anniversary ?? null,
    hasOpenFollowUp,
    item: {
      recordId: fieldSale.id,
      masterSource: "FIELD_SALE",
      visitId: null,
      fieldSaleId: fieldSale.id,
      followUpId: fieldSale.followUp?.id ?? null,
      staffId: fieldSale.staff.id,
      staffName: fieldSale.staff.name,
      displayName: decrypted.customerName,
      visitDate: fieldSale.activityDate.toISOString(),
      visitDateLabel: formatDate(fieldSale.activityDate),
      customerType: fieldSale.customerType,
      purchaseStatus,
      valueTier,
      visitSummary: buildFieldSaleSummary(fieldSale),
      queue,
      followUpDueDate: fieldSale.followUp?.followUpDate.toISOString() ?? null,
      lastCallStatus: lastCallAnswered,
      notes,
      canCall: decrypted.customerPhone.replace(/\D/g, "").length >= 10,
    },
  };
}

function toDbQueryParams(params: ListStaffCallsParams): StaffCallsDbQueryParams {
  return {
    staffId: params.staffId,
    storeId: params.storeId,
    storeScope: params.storeScope,
    viewStaffId: params.viewStaffId,
    master: params.master,
    segment: params.segment,
    valueTier: params.valueTier,
    queue: params.queue,
    birthday: params.birthday,
    anniversary: params.anniversary,
    year: params.year,
    month: params.month,
  };
}

async function hydrateStaffCallPage(
  refs: StaffCallPageRef[],
  staffId: string,
  storeScope = false,
): Promise<StaffCallListItem[]> {
  if (refs.length === 0) return [];

  const visitIds = refs.filter((ref) => ref.source === "VISIT").map((ref) => ref.id);
  const fieldSaleIds = refs.filter((ref) => ref.source === "FIELD_SALE").map((ref) => ref.id);

  const [visits, fieldSales] = await Promise.all([
    visitIds.length > 0
      ? prisma.visit.findMany({
          where: { id: { in: visitIds } },
          select: visitListSelect(staffId, storeScope),
        })
      : Promise.resolve([]),
    fieldSaleIds.length > 0
      ? prisma.fieldSale.findMany({
          where: { id: { in: fieldSaleIds } },
          select: fieldSaleListSelect(staffId, storeScope),
        })
      : Promise.resolve([]),
  ]);

  const visitItems = new Map(
    visits.map((visit) => [visit.id, toVisitRecord(visit, staffId, storeScope).item] as const),
  );
  const fieldSaleItems = new Map(
    fieldSales.map(
      (fieldSale) =>
        [fieldSale.id, toFieldSaleRecord(fieldSale, staffId, storeScope).item] as const,
    ),
  );

  return refs
    .map((ref) =>
      ref.source === "VISIT" ? visitItems.get(ref.id) : fieldSaleItems.get(ref.id),
    )
    .filter((item): item is StaffCallListItem => item !== undefined);
}

type StaffCallFilterParams = Omit<ListStaffCallsParams, "page" | "pageSize">;

export async function listStaffCallFilters(
  params: StaffCallFilterParams,
): Promise<StaffCallFilterCounts> {
  const [yearRecords, pendingRecords] = await Promise.all([
    fetchStaffCallYearRecords(
      params.staffId,
      params.storeId,
      params.year,
      params.storeScope,
    ),
    fetchStaffCallPendingActionRecords(
      params.staffId,
      params.storeId,
      params.storeScope,
    ),
  ]);
  const records = mergeStaffCallYearRecords(yearRecords, pendingRecords);
  return countStaffCallFiltersFromRecords(records, params);
}

export async function resolveStaffCallRecord(params: {
  staffId: string;
  storeId: string;
  storeScope?: boolean;
  customerId?: string;
  visitId?: string;
  fieldSaleId?: string;
}): Promise<StaffCallListItem | null> {
  const { staffId, storeId, storeScope = false } = params;
  const staffFilter = storeScope ? {} : { staffId };

  if (params.visitId) {
    const visit = await prisma.visit.findFirst({
      where: { id: params.visitId, storeId, ...staffFilter },
      select: visitListSelect(staffId, storeScope),
    });
    return visit ? toVisitRecord(visit, staffId, storeScope).item : null;
  }

  if (params.fieldSaleId) {
    const fieldSale = await prisma.fieldSale.findFirst({
      where: { id: params.fieldSaleId, storeId, ...staffFilter },
      select: fieldSaleListSelect(staffId, storeScope),
    });
    return fieldSale ? toFieldSaleRecord(fieldSale, staffId, storeScope).item : null;
  }

  if (params.customerId) {
    const visit = await prisma.visit.findFirst({
      where: { customerId: params.customerId, storeId, ...staffFilter },
      orderBy: { visitDate: "desc" },
      select: visitListSelect(staffId, storeScope),
    });
    if (visit) return toVisitRecord(visit, staffId, storeScope).item;

    const fieldSale = await prisma.fieldSale.findFirst({
      where: { customerId: params.customerId, storeId, ...staffFilter },
      orderBy: { activityDate: "desc" },
      select: fieldSaleListSelect(staffId, storeScope),
    });
    return fieldSale ? toFieldSaleRecord(fieldSale, staffId, storeScope).item : null;
  }

  return null;
}

export async function listStaffCalls(params: ListStaffCallsParams): Promise<StaffCallListResponse> {
  const dbParams = toDbQueryParams(params);
  const skip = (params.page - 1) * params.pageSize;

  const [total, pageRefs] = await Promise.all([
    countMergedStaffCalls(dbParams),
    fetchMergedStaffCallPageIds(dbParams, skip, params.pageSize),
  ]);

  const data = await hydrateStaffCallPage(pageRefs, params.staffId, params.storeScope);

  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    year: params.year,
    month: params.month,
  };
}

export async function revealStaffCallPhone(params: {
  recordId: string;
  masterSource: StaffCallMasterSource;
  staffId: string;
  storeId: string;
  storeScope?: boolean;
}): Promise<StaffCallDialResult | null> {
  const staffFilter = recordStaffFilter(params.staffId, params.storeScope);

  if (params.masterSource === "FIELD_SALE") {
    const fieldSale = await prisma.fieldSale.findFirst({
      where: {
        id: params.recordId,
        storeId: params.storeId,
        ...staffFilter,
      },
      select: {
        customerName: true,
        customerPhone: true,
      },
    });

    if (!fieldSale) return null;

    await prisma.phoneRevealLog.create({
      data: {
        fieldSaleId: params.recordId,
        staffId: params.staffId,
      },
    });

    const decrypted = decryptVisitPii(fieldSale);
    const digits = decrypted.customerPhone.replace(/\D/g, "");
    if (digits.length < 10) return null;
    const normalized = digits.slice(-10);

    return {
      recordId: params.recordId,
      masterSource: "FIELD_SALE",
      visitId: null,
      fieldSaleId: params.recordId,
      displayName: decrypted.customerName,
      phone: normalized,
      dialUrl: `tel:+91${normalized}`,
    };
  }

  const visit = await prisma.visit.findFirst({
    where: {
      id: params.recordId,
      storeId: params.storeId,
      ...staffFilter,
    },
    select: {
      customerName: true,
      customerPhone: true,
      sourceChannel: true,
    },
  });

  if (!visit) return null;
  const resolvedMasterSource = classifyVisitMasterSource(visit.sourceChannel);
  if (resolvedMasterSource !== params.masterSource) return null;

  await prisma.phoneRevealLog.create({
    data: {
      visitId: params.recordId,
      staffId: params.staffId,
    },
  });

  const decrypted = decryptVisitPii(visit);
  const digits = decrypted.customerPhone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const normalized = digits.slice(-10);

  return {
    recordId: params.recordId,
    masterSource: resolvedMasterSource,
    visitId: params.recordId,
    fieldSaleId: null,
    displayName: decrypted.customerName,
    phone: normalized,
    dialUrl: `tel:+91${normalized}`,
  };
}

async function recordVisitCallOutcome(
  params: RecordStaffCallOutcomeParams,
): Promise<StaffCallOutcomeResult | null> {
  const staffFilter = recordStaffFilter(params.staffId, params.storeScope);

  const visit = await prisma.visit.findFirst({
    where: {
      id: params.recordId,
      storeId: params.storeId,
      ...staffFilter,
    },
    include: {
      followUp: true,
    },
  });

  if (!visit) return null;
  const resolvedMasterSource = classifyVisitMasterSource(visit.sourceChannel);
  if (resolvedMasterSource !== params.masterSource) return null;

  const followUpAssignee = (existingAssignedStaffId?: string | null) =>
    resolveFollowUpAssignee({
      storeScope: params.storeScope,
      recordOwnerStaffId: visit.staffId,
      callerStaffId: params.staffId,
      existingAssignedStaffId: existingAssignedStaffId ?? visit.followUp?.assignedStaffId,
    });

  return prisma
    .$transaction(async (tx) => {
      const callTime = new Date();
      await tx.staffCallLog.create({
        data: {
          visitId: params.recordId,
          staffId: params.staffId,
          answered: params.answered,
          feedback: params.feedback,
        },
      });

      await tx.visit.update({
        where: { id: params.recordId },
        data: {
          lastCallAnswered: params.answered,
          lastCallAt: callTime,
        },
      });

      let followUpId = visit.followUp?.id ?? null;
      let queue: StaffCallQueue = "RETENTION";

      if (params.answered === "NOT_ANSWERED") {
        const followUpDate =
          visit.followUp?.followUpDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

        const followUp = visit.followUp
          ? await tx.followUp.update({
              where: { id: visit.followUp.id },
              data: {
                status: "OPEN",
                assignedStaffId: followUpAssignee(visit.followUp?.assignedStaffId),
                followUpDate,
                callOutcome: "NOT_ANSWERED",
                outcomeDate: new Date(),
                notes: params.feedback ?? visit.followUp.notes,
                reason: visit.followUp.reason ?? "Call not answered",
              },
            })
          : await tx.followUp.create({
              data: {
                visitId: params.recordId,
                assignedStaffId: followUpAssignee(),
                followUpDate,
                status: "OPEN",
                callOutcome: "NOT_ANSWERED",
                outcomeDate: new Date(),
                notes: params.feedback,
                reason: "Call not answered",
              },
            });

        followUpId = followUp.id;
        queue = "NOT_ANSWERED";
      } else {
        if (params.scheduleFollowUp && params.followUpDate) {
          const followUp = visit.followUp
            ? await tx.followUp.update({
                where: { id: visit.followUp.id },
                data: {
                  status: "OPEN",
                  assignedStaffId: followUpAssignee(visit.followUp?.assignedStaffId),
                  followUpDate: params.followUpDate,
                  callOutcome: "ANSWERED",
                  outcomeDate: new Date(),
                  notes: params.feedback ?? visit.followUp.notes,
                  reason: visit.followUp.reason ?? "Follow-up after answered call",
                },
              })
            : await tx.followUp.create({
                data: {
                  visitId: params.recordId,
                  assignedStaffId: followUpAssignee(),
                  followUpDate: params.followUpDate,
                  status: "OPEN",
                  callOutcome: "ANSWERED",
                  outcomeDate: new Date(),
                  notes: params.feedback,
                  reason: "Follow-up after answered call",
                },
              });

          followUpId = followUp.id;
          queue = "FOLLOW_UP";
        } else if (visit.followUp?.status === "OPEN") {
          const followUp = await tx.followUp.update({
            where: { id: visit.followUp.id },
            data: {
              status: "CLOSED",
              callOutcome: "ANSWERED",
              outcomeDate: new Date(),
              notes: params.feedback ?? visit.followUp.notes,
            },
          });
          followUpId = followUp.id;
        }

        await tx.visit.update({
          where: { id: params.recordId },
          data: {
            followUpNeeded: params.scheduleFollowUp ?? visit.followUpNeeded,
            followUpDate: params.scheduleFollowUp ? params.followUpDate : visit.followUpDate,
          },
        });
      }

      return {
        recordId: params.recordId,
        masterSource: resolvedMasterSource,
        visitId: params.recordId,
        fieldSaleId: null,
        followUpId,
        queue,
        message:
          params.answered === "NOT_ANSWERED"
            ? "Moved to follow-up calls"
            : params.scheduleFollowUp
              ? "Follow-up scheduled"
              : "Call feedback saved",
      };
    })
    .then((result) => {
      notifyPortalDataChangeNow(params.storeId, ["callLogs", "followUps", "visits"]);
      return result;
    });
}

async function recordFieldSaleCallOutcome(
  params: RecordStaffCallOutcomeParams,
): Promise<StaffCallOutcomeResult | null> {
  const staffFilter = recordStaffFilter(params.staffId, params.storeScope);

  const fieldSale = await prisma.fieldSale.findFirst({
    where: {
      id: params.recordId,
      storeId: params.storeId,
      ...staffFilter,
    },
    include: {
      followUp: true,
    },
  });

  if (!fieldSale) return null;

  const followUpAssignee = (existingAssignedStaffId?: string | null) =>
    resolveFollowUpAssignee({
      storeScope: params.storeScope,
      recordOwnerStaffId: fieldSale.staffId,
      callerStaffId: params.staffId,
      existingAssignedStaffId: existingAssignedStaffId ?? fieldSale.followUp?.assignedStaffId,
    });

  return prisma
    .$transaction(async (tx) => {
      const callTime = new Date();
      await tx.staffCallLog.create({
        data: {
          fieldSaleId: params.recordId,
          staffId: params.staffId,
          answered: params.answered,
          feedback: params.feedback,
        },
      });

      await tx.fieldSale.update({
        where: { id: params.recordId },
        data: {
          lastCallAnswered: params.answered,
          lastCallAt: callTime,
        },
      });

      let followUpId = fieldSale.followUp?.id ?? null;
      let queue: StaffCallQueue = "RETENTION";

      if (params.answered === "NOT_ANSWERED") {
        const followUpDate =
          fieldSale.followUp?.followUpDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

        const followUp = fieldSale.followUp
          ? await tx.followUp.update({
              where: { id: fieldSale.followUp.id },
              data: {
                status: "OPEN",
                assignedStaffId: followUpAssignee(fieldSale.followUp?.assignedStaffId),
                followUpDate,
                callOutcome: "NOT_ANSWERED",
                outcomeDate: new Date(),
                notes: params.feedback ?? fieldSale.followUp.notes,
                reason: fieldSale.followUp.reason ?? "Call not answered",
              },
            })
          : await tx.followUp.create({
              data: {
                fieldSaleId: params.recordId,
                assignedStaffId: followUpAssignee(),
                followUpDate,
                status: "OPEN",
                callOutcome: "NOT_ANSWERED",
                outcomeDate: new Date(),
                notes: params.feedback,
                reason: "Call not answered",
              },
            });

        followUpId = followUp.id;
        queue = "NOT_ANSWERED";
      } else {
        if (params.scheduleFollowUp && params.followUpDate) {
          const followUp = fieldSale.followUp
            ? await tx.followUp.update({
                where: { id: fieldSale.followUp.id },
                data: {
                  status: "OPEN",
                  assignedStaffId: followUpAssignee(fieldSale.followUp?.assignedStaffId),
                  followUpDate: params.followUpDate,
                  callOutcome: "ANSWERED",
                  outcomeDate: new Date(),
                  notes: params.feedback ?? fieldSale.followUp.notes,
                  reason: fieldSale.followUp.reason ?? "Follow-up after answered call",
                },
              })
            : await tx.followUp.create({
                data: {
                  fieldSaleId: params.recordId,
                  assignedStaffId: followUpAssignee(),
                  followUpDate: params.followUpDate,
                  status: "OPEN",
                  callOutcome: "ANSWERED",
                  outcomeDate: new Date(),
                  notes: params.feedback,
                  reason: "Follow-up after answered call",
                },
              });

          followUpId = followUp.id;
          queue = "FOLLOW_UP";
        } else if (fieldSale.followUp?.status === "OPEN") {
          const followUp = await tx.followUp.update({
            where: { id: fieldSale.followUp.id },
            data: {
              status: "CLOSED",
              callOutcome: "ANSWERED",
              outcomeDate: new Date(),
              notes: params.feedback ?? fieldSale.followUp.notes,
            },
          });
          followUpId = followUp.id;
        }

        await tx.fieldSale.update({
          where: { id: params.recordId },
          data: {
            followUpNeeded: params.scheduleFollowUp ?? fieldSale.followUpNeeded,
            followUpDate: params.scheduleFollowUp ? params.followUpDate : fieldSale.followUpDate,
          },
        });
      }

      return {
        recordId: params.recordId,
        masterSource: "FIELD_SALE" as const,
        visitId: null,
        fieldSaleId: params.recordId,
        followUpId,
        queue,
        message:
          params.answered === "NOT_ANSWERED"
            ? "Moved to follow-up calls"
            : params.scheduleFollowUp
              ? "Follow-up scheduled"
              : "Call feedback saved",
      };
    })
    .then((result) => {
      notifyPortalDataChangeNow(params.storeId, ["callLogs", "followUps", "fieldSales"]);
      return result;
    });
}

export async function recordStaffCallOutcome(
  params: RecordStaffCallOutcomeParams,
): Promise<StaffCallOutcomeResult | null> {
  if (params.masterSource === "FIELD_SALE") {
    return recordFieldSaleCallOutcome(params);
  }
  return recordVisitCallOutcome(params);
}

interface RecordManualStaffCallParams extends ManualStaffCallInput {
  staffId: string;
  storeId: string;
}

export class ManualStaffCallError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = "ManualStaffCallError";
  }
}

/** Creates a call-log anchor visit (USER_CALLS) and records the outcome — hidden from visit lists. */
export async function recordManualStaffCall(
  params: RecordManualStaffCallParams,
): Promise<StaffCallOutcomeResult> {
  const {
    customerName,
    customerPhone,
    customerType,
    staffNotes,
    answered,
    feedback,
    scheduleFollowUp,
    followUpDate,
    staffId,
    storeId,
  } = params;

  let visitId: string | null = null;

  try {
    const phoneHash = hashPhone(phoneDigitsForHash(customerPhone));
    const existingCustomer = await lookupCustomerByPhone(storeId, customerPhone);

    const visitWhere: Prisma.VisitWhereInput = {
      storeId,
      staffId,
      OR: [
        ...(existingCustomer ? [{ customerId: existingCustomer.id }] : []),
        { customerPhoneHash: phoneHash },
      ],
    };

    const existingVisit = await prisma.visit.findFirst({
      where: visitWhere,
      orderBy: { visitDate: "desc" },
      select: { id: true, sourceChannel: true },
    });

    if (existingVisit) {
      const result = await recordStaffCallOutcome({
        recordId: existingVisit.id,
        masterSource: classifyVisitMasterSource(existingVisit.sourceChannel),
        staffId,
        storeId,
        answered,
        feedback,
        scheduleFollowUp,
        followUpDate,
      });

      if (!result) {
        throw new ManualStaffCallError("Failed to record manual call outcome");
      }

      return result;
    }

    const existingFieldSale = await prisma.fieldSale.findFirst({
      where: {
        storeId,
        staffId,
        OR: [
          ...(existingCustomer ? [{ customerId: existingCustomer.id }] : []),
          { customerPhoneHash: phoneHash },
        ],
      },
      orderBy: { activityDate: "desc" },
      select: { id: true },
    });

    if (existingFieldSale) {
      const result = await recordStaffCallOutcome({
        recordId: existingFieldSale.id,
        masterSource: "FIELD_SALE",
        staffId,
        storeId,
        answered,
        feedback,
        scheduleFollowUp,
        followUpDate,
      });

      if (!result) {
        throw new ManualStaffCallError("Failed to record manual call outcome");
      }

      return result;
    }

    const visit = await createVisit({
      storeId,
      staffId,
      customerName,
      customerPhone,
      customerType,
      visitType: "WALK_IN",
      sourceChannel: "USER_CALLS",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: [],
      productsPurchased: [],
      schemesPitched: [],
      followUpNeeded: false,
      staffNotes,
      visitDate: new Date(),
    });

    visitId = visit.id;

    const result = await recordStaffCallOutcome({
      recordId: visit.id,
      masterSource: "EXTERNAL",
      staffId,
      storeId,
      answered,
      feedback,
      scheduleFollowUp,
      followUpDate,
    });

    if (!result) {
      throw new ManualStaffCallError("Failed to record manual call outcome");
    }

    return result;
  } catch (error) {
    if (visitId) {
      await prisma.followUp.deleteMany({ where: { visitId } }).catch(() => undefined);
      await prisma.visit.delete({ where: { id: visitId } }).catch((rollbackError) => {
        console.error(
          "[recordManualStaffCall] failed to rollback orphan visit",
          visitId,
          rollbackError,
        );
      });
    }

    if (error instanceof ManualStaffCallError) {
      throw error;
    }

    throw new ManualStaffCallError(
      error instanceof Error ? error.message : "Failed to record manual call",
    );
  }
}
