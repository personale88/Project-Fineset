import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import type { PortalCallsQuery } from "@/lib/validations/portal-calls.schema";
import {
  buildCallsPeriodRange,
  buildFollowUpOpenWhere,
  buildNotAnsweredWhere,
} from "@/lib/services/call-queue-utils";
import {
  buildVisitSegmentWhere,
  buildVisitValueTierWhere,
} from "@/lib/services/staff-calls-query";
import {
  buildVisitCallSummary,
  computeVisitValueTier,
  deriveCallQueue,
  extractCallQueueSignals,
  matchesCallIntentTier,
  matchesCallQueue,
  matchesCallSegment,
  matchesCallValueTier,
  matchesVisitPeriod,
} from "@/lib/services/call-list-utils";
import { maskCustomerPhone } from "@/lib/utils/pii-display";
import { decryptVisitPii } from "@/lib/services/pii";
import { formatDate } from "@/lib/utils/formatters";
import type {
  PortalCallListItem,
  PortalCallListResponse,
  StaffCallFilterCounts,
  StaffCallQueue,
  StaffCallSegment,
  StaffCallValueTier,
} from "@/types";
import { Prisma } from "@prisma/client";

interface ListPortalCallsParams extends PortalCallsQuery {
  storeId?: string;
}

const portalVisitListSelect = (): Prisma.VisitSelect => ({
  id: true,
  staffId: true,
  visitDate: true,
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
  lastCallAnswered: true,
  staff: {
    select: {
      id: true,
      name: true,
    },
  },
  store: {
    select: {
      id: true,
      name: true,
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
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      staffId: true,
      answered: true,
      createdAt: true,
      feedback: true,
    },
  },
});

type PortalVisitRow = Prisma.VisitGetPayload<{
  select: ReturnType<typeof portalVisitListSelect>;
}>;

function getLastCallForStaff(visit: PortalVisitRow) {
  return (
    visit.callLogs.find((log) => log.staffId === visit.staffId) ??
    visit.callLogs[0] ??
    null
  );
}

function maskCustomerPhoneForPortal(phone: string): string {
  return maskCustomerPhone(phone);
}

function toPortalCallItem(visit: PortalVisitRow): PortalCallListItem {
  const decrypted = decryptVisitPii(visit);
  const valueTier = computeVisitValueTier(visit);
  const lastCall = getLastCallForStaff(visit);
  const signals = extractCallQueueSignals({
    staffId: visit.staffId,
    followUp: visit.followUp,
    lastCallAnswered: visit.lastCallAnswered,
    callLogs: visit.callLogs,
  });
  const notes =
    lastCall?.feedback?.trim() ||
    visit.followUp?.notes?.trim() ||
    visit.staffNotes?.trim() ||
    null;

  return {
    visitId: visit.id,
    followUpId: visit.followUp?.id ?? null,
    customerName: decrypted.customerName,
    customerPhone: maskCustomerPhoneForPortal(decrypted.customerPhone),
    staffId: visit.staff.id,
    staffName: visit.staff.name,
    storeId: visit.store.id,
    storeName: visit.store.name,
    visitDate: visit.visitDate.toISOString(),
    visitDateLabel: formatDate(visit.visitDate),
    customerType: visit.customerType,
    purchaseStatus: visit.purchaseStatus,
    valueTier,
    visitSummary: buildVisitCallSummary(visit),
    queue: deriveCallQueue(signals),
    followUpDueDate: visit.followUp?.followUpDate.toISOString() ?? null,
    lastCallStatus: lastCall?.answered ?? null,
    notes,
  };
}

function matchesSearch(visit: PortalVisitRow, search?: string): boolean {
  if (!search?.trim()) return true;

  const decrypted = decryptVisitPii(visit);
  const term = search.trim().toLowerCase();
  const normalizedPhone = search.replace(/\D/g, "");

  if (decrypted.customerName.toLowerCase().includes(term)) return true;
  if (visit.staff.name.toLowerCase().includes(term)) return true;
  if (
    normalizedPhone.length >= 4 &&
    decrypted.customerPhone.replace(/\D/g, "").includes(normalizedPhone)
  ) {
    return true;
  }

  return false;
}

function getAvailableYears(visits: PortalVisitRow[]): number[] {
  const years = new Set(visits.map((visit) => visit.visitDate.getFullYear()));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

function countFilters(
  visits: PortalVisitRow[],
  active: {
    segment: StaffCallSegment;
    valueTier: StaffCallValueTier;
    queue: StaffCallQueue;
    year: number;
    month: number;
    staffId?: string;
    search?: string;
    intentTier?: import("@prisma/client").IntentTier;
  },
): StaffCallFilterCounts {
  const base = visits.filter(
    (visit) =>
      (!active.staffId || visit.staffId === active.staffId) &&
      matchesSearch(visit, active.search),
  );

  const segments: StaffCallSegment[] = [
    "ALL",
    "NEW",
    "RETAINED",
    "PURCHASED",
    "NOT_PURCHASED",
  ];
  const valueTiers: StaffCallValueTier[] = ["ALL", "HIGH", "MID", "LOW"];
  const queues: StaffCallQueue[] = ["ALL", "NOT_ANSWERED", "FOLLOW_UP"];

  const withPeriod = (visit: PortalVisitRow, month: number) =>
    matchesCallSegment(visit, active.segment) &&
    matchesCallValueTier(visit, active.valueTier) &&
    matchesCallIntentTier(visit, active.intentTier) &&
    matchesCallQueue(
      { ...visit, callLogs: visit.callLogs.map((log) => ({ ...log })) },
      active.queue,
    ) &&
    matchesVisitPeriod(visit.visitDate, active.year, month);

  return {
    segments: segments.map((segment) => ({
      key: segment,
      count: base.filter(
        (visit) =>
          matchesCallSegment(visit, segment) &&
          matchesCallValueTier(visit, active.valueTier) &&
          matchesCallIntentTier(visit, active.intentTier) &&
          matchesCallQueue(visit, active.queue) &&
          matchesVisitPeriod(visit.visitDate, active.year, active.month),
      ).length,
    })),
    valueTiers: valueTiers.map((tier) => ({
      key: tier,
      count: base.filter(
        (visit) =>
          matchesCallSegment(visit, active.segment) &&
          matchesCallValueTier(visit, tier) &&
          matchesCallIntentTier(visit, active.intentTier) &&
          matchesCallQueue(visit, active.queue) &&
          matchesVisitPeriod(visit.visitDate, active.year, active.month),
      ).length,
    })),
    queues: queues.map((queue) => ({
      key: queue,
      count: base.filter(
        (visit) =>
          matchesCallSegment(visit, active.segment) &&
          matchesCallValueTier(visit, active.valueTier) &&
          matchesCallIntentTier(visit, active.intentTier) &&
          matchesCallQueue(visit, queue) &&
          matchesVisitPeriod(visit.visitDate, active.year, active.month),
      ).length,
    })),
    birthdays: [
      { key: "ALL", count: base.length },
      { key: "THIS_MONTH", count: 0 },
    ],
    anniversaries: [
      { key: "ALL", count: base.length },
      { key: "THIS_MONTH", count: 0 },
    ],
    masters: [
      { key: "ALL" as const, count: base.length },
      { key: "STORE_VISIT" as const, count: base.length },
      { key: "FIELD_SALE" as const, count: 0 },
      { key: "EXTERNAL" as const, count: 0 },
    ],
    months: Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return {
        month,
        count: base.filter((visit) => withPeriod(visit, month)).length,
      };
    }),
    availableYears: getAvailableYears(base),
  };
}

function portalPeriodRange(year: number, month: number): { start: Date; end: Date } {
  return buildCallsPeriodRange(year, month);
}

export function buildPortalVisitsWhere(params: ListPortalCallsParams): Prisma.VisitWhereInput {
  const { start, end } = portalPeriodRange(params.year, params.month);
  const where: Prisma.VisitWhereInput = {
    visitDate: { gte: start, lte: end },
    ...buildVisitSegmentWhere(params.segment),
    ...buildVisitValueTierWhere(params.valueTier),
  };

  if (params.queue === "NOT_ANSWERED") {
    Object.assign(where, buildNotAnsweredWhere());
  } else if (params.queue === "FOLLOW_UP") {
    where.followUp = params.staffId
      ? buildFollowUpOpenWhere(params.staffId)
      : { is: { status: "OPEN" } };
  }

  if (params.storeId) where.storeId = params.storeId;
  if (params.staffId) where.staffId = params.staffId;
  if (params.intentTier) where.intentTier = params.intentTier;
  return where;
}

/** Base WHERE without filter dimensions — for filter count queries. */
function buildPortalCountBaseWhere(params: ListPortalCallsParams): Prisma.VisitWhereInput {
  const where: Prisma.VisitWhereInput = {};
  if (params.storeId) where.storeId = params.storeId;
  if (params.staffId) where.staffId = params.staffId;
  if (params.intentTier) where.intentTier = params.intentTier;
  return where;
}

/** Build WHERE for a specific filter dimension count (all active filters except the one varying). */
function buildPortalCountWhere(
  params: ListPortalCallsParams,
  overrides: {
    segment?: StaffCallSegment;
    valueTier?: StaffCallValueTier;
    queue?: StaffCallQueue;
    month?: number;
  },
): Prisma.VisitWhereInput {
  const segment = overrides.segment ?? params.segment;
  const valueTier = overrides.valueTier ?? params.valueTier;
  const queue = overrides.queue ?? params.queue;
  const month = overrides.month ?? params.month;

  const { start, end } = portalPeriodRange(params.year, month);
  const where: Prisma.VisitWhereInput = {
    ...buildPortalCountBaseWhere(params),
    visitDate: { gte: start, lte: end },
    ...buildVisitSegmentWhere(segment),
    ...buildVisitValueTierWhere(valueTier),
  };

  if (queue === "NOT_ANSWERED") {
    Object.assign(where, buildNotAnsweredWhere());
  } else if (queue === "FOLLOW_UP") {
    where.followUp = params.staffId
      ? buildFollowUpOpenWhere(params.staffId)
      : { is: { status: "OPEN" } };
  }

  return where;
}

async function getPortalAvailableYears(storeId?: string, staffId?: string): Promise<number[]> {
  type YearRow = { year: number };
  const parts: Prisma.Sql[] = [];
  if (storeId) parts.push(Prisma.sql`"storeId" = ${storeId}`);
  if (staffId) parts.push(Prisma.sql`"staffId" = ${staffId}`);
  const whereClause =
    parts.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<YearRow[]>`
    SELECT DISTINCT EXTRACT(YEAR FROM "visitDate")::int AS year
    FROM "Visit"
    ${whereClause}
    ORDER BY year DESC
    LIMIT 10
  `;

  const years = new Set(rows.map((r) => Number(r.year)));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
}

async function computePortalFilterCounts(
  params: ListPortalCallsParams,
): Promise<StaffCallFilterCounts> {
  const segments: StaffCallSegment[] = ["ALL", "NEW", "RETAINED", "PURCHASED", "NOT_PURCHASED"];
  const valueTiers: StaffCallValueTier[] = ["ALL", "HIGH", "MID", "LOW"];
  const queues: StaffCallQueue[] = ["ALL", "NOT_ANSWERED", "FOLLOW_UP"];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const [segmentCounts, valueTierCounts, queueCounts, monthCounts, availableYears] =
    await Promise.all([
      Promise.all(
        segments.map((s) =>
          prisma.visit.count({ where: buildPortalCountWhere(params, { segment: s }) }),
        ),
      ),
      Promise.all(
        valueTiers.map((vt) =>
          prisma.visit.count({ where: buildPortalCountWhere(params, { valueTier: vt }) }),
        ),
      ),
      Promise.all(
        queues.map((q) =>
          prisma.visit.count({ where: buildPortalCountWhere(params, { queue: q }) }),
        ),
      ),
      Promise.all(
        months.map((m) =>
          prisma.visit.count({ where: buildPortalCountWhere(params, { month: m }) }),
        ),
      ),
      getPortalAvailableYears(params.storeId, params.staffId),
    ]);

  const total = segmentCounts[0] ?? 0;

  return {
    segments: segments.map((key, i) => ({ key, count: segmentCounts[i] ?? 0 })),
    valueTiers: valueTiers.map((key, i) => ({ key, count: valueTierCounts[i] ?? 0 })),
    queues: queues.map((key, i) => ({ key, count: queueCounts[i] ?? 0 })),
    birthdays: [
      { key: "ALL", count: total },
      { key: "THIS_MONTH", count: 0 },
    ],
    anniversaries: [
      { key: "ALL", count: total },
      { key: "THIS_MONTH", count: 0 },
    ],
    masters: [
      { key: "ALL" as const, count: total },
      { key: "STORE_VISIT" as const, count: total },
      { key: "FIELD_SALE" as const, count: 0 },
      { key: "EXTERNAL" as const, count: 0 },
    ],
    months: months.map((month, i) => ({ month, count: monthCounts[i] ?? 0 })),
    availableYears,
  };
}

/** Fallback path when search is active — requires in-memory PII decryption. */
async function listPortalCallsWithSearch(
  params: ListPortalCallsParams,
): Promise<PortalCallListResponse> {
  const { start, end } = portalPeriodRange(params.year, params.month);
  const periodWhere: Prisma.VisitWhereInput = {
    visitDate: { gte: start, lte: end },
    ...buildPortalCountBaseWhere(params),
  };

  const allVisits = await prisma.visit.findMany({
    where: periodWhere,
    orderBy: { visitDate: "desc" },
    select: portalVisitListSelect(),
  });

  const filtered = allVisits.filter(
    (visit) =>
      matchesSearch(visit, params.search) &&
      matchesCallSegment(visit, params.segment) &&
      matchesCallValueTier(visit, params.valueTier) &&
      matchesCallIntentTier(visit, params.intentTier) &&
      matchesCallQueue(visit, params.queue),
  );

  const total = filtered.length;
  const pageStart = (params.page - 1) * params.pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + params.pageSize);

  return {
    data: pageItems.map(toPortalCallItem),
    total,
    page: params.page,
    pageSize: params.pageSize,
    year: params.year,
    month: params.month,
    filters: countFilters(allVisits, {
      segment: params.segment,
      valueTier: params.valueTier,
      queue: params.queue,
      year: params.year,
      month: params.month,
      staffId: params.staffId,
      search: params.search,
      intentTier: params.intentTier,
    }),
  };
}

export async function listPortalCalls(
  params: ListPortalCallsParams,
): Promise<PortalCallListResponse> {
  // Search requires in-memory PII decryption — cannot be pushed to SQL
  if (params.search?.trim()) {
    return listPortalCallsWithSearch(params);
  }

  return unstable_cache(
    async (p: ListPortalCallsParams) => {
      const where = buildPortalVisitsWhere(p);
      const skip = (p.page - 1) * p.pageSize;

      const [pageItems, total, filters] = await Promise.all([
        prisma.visit.findMany({
          where,
          orderBy: { visitDate: "desc" },
          skip,
          take: p.pageSize,
          select: portalVisitListSelect(),
        }),
        prisma.visit.count({ where }),
        computePortalFilterCounts(p),
      ]);

      return {
        data: pageItems.map(toPortalCallItem),
        total,
        page: p.page,
        pageSize: p.pageSize,
        year: p.year,
        month: p.month,
        filters,
      };
    },
    ["listPortalCalls", params.storeId ?? "", String(params.year), String(params.month), String(params.page)],
    {
      revalidate: 30,
      tags: [
        "analytics",
        ...(params.storeId ? [`store:${params.storeId}`] : []),
      ],
    },
  )(params);
}
