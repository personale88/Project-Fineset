import { listFollowUps } from "@/lib/services/follow-ups";
import { listStaffCalls } from "@/lib/services/staff-calls";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import {
  getMonthsInWorkQueuePeriod,
  isCallVisitInWorkQueuePeriod,
  isFollowUpInWorkQueuePeriod,
  shouldIncludeOccasionCalls,
} from "@/lib/utils/work-queue-period";
import type { AnalyticsPeriodLabel, StaffCallListItem } from "@/types";
import type {
  StaffWorkQueueCategoryTotals,
  StaffWorkQueueItem,
  StaffWorkQueueReason,
  StaffWorkQueueResponse,
  StoreWorkQueueSummary,
} from "@/types/staff-work-queue";

export type {
  StaffWorkQueueItem,
  StaffWorkQueueReason,
  StaffWorkQueueResponse,
  StoreWorkQueueSummary,
} from "@/types/staff-work-queue";

const REASON_ORDER: StaffWorkQueueReason[] = [
  "overdue_task",
  "mismatched_assignment",
  "due_today_task",
  "not_answered",
  "follow_up_call",
  "birthday",
  "anniversary",
];

const REASON_PRIORITY: Record<StaffWorkQueueReason, number> = {
  overdue_task: 1,
  mismatched_assignment: 2,
  due_today_task: 3,
  not_answered: 4,
  follow_up_call: 5,
  birthday: 6,
  anniversary: 7,
};

const DEFAULT_PREVIEW_LIMIT = 30;
const MAX_PREVIEW_LIMIT = 100;

function normalizeLimit(limit?: number): number {
  if (limit == null || !Number.isFinite(limit)) return DEFAULT_PREVIEW_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PREVIEW_LIMIT);
}

function dedupeKey(item: StaffWorkQueueItem): string {
  if (item.followUp) return `follow-up:${item.followUp.id}`;
  if (item.call) return `call:${item.call.masterSource}:${item.call.recordId}:${item.storeId}`;
  return item.id;
}

function countByReason(items: StaffWorkQueueItem[]): StaffWorkQueueCategoryTotals {
  const totals: StaffWorkQueueCategoryTotals = {};
  for (const reason of REASON_ORDER) {
    const count = items.filter((item) => item.reason === reason).length;
    if (count > 0) totals[reason] = count;
  }
  return totals;
}

function countByStore(items: StaffWorkQueueItem[]): StoreWorkQueueSummary[] {
  const map = new Map<string, StoreWorkQueueSummary>();
  for (const item of items) {
    const existing = map.get(item.storeId);
    if (existing) {
      existing.total += 1;
    } else {
      map.set(item.storeId, {
        storeId: item.storeId,
        storeName: item.storeName,
        total: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return a.storeName.localeCompare(b.storeName);
  });
}

function buildWorkQueueResponse(
  items: StaffWorkQueueItem[],
  limit: number,
): StaffWorkQueueResponse {
  const seen = new Set<string>();
  const merged = items
    .sort((a, b) => a.priority - b.priority)
    .filter((item) => {
      const key = dedupeKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const byReason = new Map<StaffWorkQueueReason, StaffWorkQueueItem[]>();
  for (const reason of REASON_ORDER) {
    byReason.set(reason, []);
  }
  for (const item of merged) {
    byReason.get(item.reason)?.push(item);
  }

  const previewSeen = new Set<string>();
  const preview: StaffWorkQueueItem[] = [];

  function addPreviewItem(item: StaffWorkQueueItem): boolean {
    const key = dedupeKey(item);
    if (previewSeen.has(key)) return false;
    previewSeen.add(key);
    preview.push(item);
    return true;
  }

  // Reserve at least one preview item per non-empty category so accordions are not empty.
  for (const reason of REASON_ORDER) {
    if (preview.length >= limit) break;
    const bucket = byReason.get(reason) ?? [];
    if (bucket.length === 0) continue;
    addPreviewItem(bucket[0]!);
  }

  for (const item of merged) {
    if (preview.length >= limit) break;
    addPreviewItem(item);
  }

  preview.sort((a, b) => a.priority - b.priority);

  return {
    items: preview,
    total: merged.length,
    categoryTotals: countByReason(merged),
    storeSummaries: countByStore(merged),
  };
}

type StaffCallQueueParams = Omit<
  Parameters<typeof listStaffCalls>[0],
  "page" | "pageSize"
>;

async function listStaffCallsForPeriod(
  baseParams: StaffCallQueueParams,
  period: AnalyticsPeriodLabel | undefined,
  limit: number,
): Promise<StaffCallListItem[]> {
  const months =
    period != null
      ? getMonthsInWorkQueuePeriod(period)
      : [{ year: baseParams.year, month: baseParams.month }];

  const pages = await Promise.all(
    months.map((month) =>
      listStaffCalls({
        ...baseParams,
        ...month,
        page: 1,
        pageSize: limit,
      }),
    ),
  );

  const seen = new Set<string>();
  const merged: StaffCallListItem[] = [];

  for (const page of pages) {
    for (const call of page.data) {
      const key = `${call.masterSource}:${call.recordId}`;
      if (seen.has(key)) continue;
      if (period != null && !isCallVisitInWorkQueuePeriod(call.visitDate, period)) {
        continue;
      }
      seen.add(key);
      merged.push(call);
    }
  }

  return merged;
}

async function collectStoreWorkQueueItems(params: {
  storeId: string;
  storeName: string;
  staffId?: string;
  storeScope?: boolean;
  limit: number;
  period?: AnalyticsPeriodLabel;
}): Promise<StaffWorkQueueItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const staffId = params.staffId ?? "store-scope";
  const storeScope = params.storeScope ?? false;
  const period = params.period;
  const callBaseParams = {
    staffId,
    storeId: params.storeId,
    storeScope,
    master: "ALL" as const,
    segment: "ALL" as const,
    valueTier: "ALL" as const,
    birthday: "ALL" as const,
    anniversary: "ALL" as const,
    year,
    month,
  };

  const [
    openFollowUps,
    mismatchedFollowUps,
    notAnswered,
    followUpCalls,
    birthdays,
    anniversaries,
  ] = await Promise.all([
    listFollowUps({
      storeId: params.storeId,
      ...(storeScope ? {} : { staffId }),
      status: "OPEN",
    }),
    storeScope
      ? listFollowUps({
          storeId: params.storeId,
          status: "OPEN",
          mismatched: true,
        })
      : Promise.resolve([]),
    listStaffCallsForPeriod(
      { ...callBaseParams, queue: "NOT_ANSWERED" },
      period,
      params.limit,
    ),
    listStaffCallsForPeriod(
      { ...callBaseParams, queue: "FOLLOW_UP" },
      period,
      params.limit,
    ),
    period != null && !shouldIncludeOccasionCalls(period)
      ? Promise.resolve([])
      : listStaffCallsForPeriod(
          { ...callBaseParams, queue: "ALL", birthday: "THIS_MONTH" },
          period,
          params.limit,
        ),
    period != null && !shouldIncludeOccasionCalls(period)
      ? Promise.resolve([])
      : listStaffCallsForPeriod(
          { ...callBaseParams, queue: "ALL", anniversary: "THIS_MONTH" },
          period,
          params.limit,
        ),
  ]);

  const items: StaffWorkQueueItem[] = [];
  const mismatchedIds = new Set(mismatchedFollowUps.map((followUp) => followUp.id));

  for (const followUp of mismatchedFollowUps) {
    if (
      period != null &&
      !isFollowUpInWorkQueuePeriod(followUp.followUpDate, period)
    ) {
      continue;
    }

    items.push({
      id: `mismatch-${followUp.id}`,
      priority: REASON_PRIORITY.mismatched_assignment,
      reason: "mismatched_assignment",
      customerName: followUp.customerName,
      subtitle: followUp.reason,
      storeId: params.storeId,
      storeName: params.storeName,
      assignedStaffName: followUp.assignedStaffName,
      followUp,
      call: null,
    });
  }

  for (const followUp of openFollowUps) {
    if (mismatchedIds.has(followUp.id)) continue;

    if (period != null) {
      if (!isFollowUpInWorkQueuePeriod(followUp.followUpDate, period)) {
        continue;
      }
    } else if (
      !isOverdueFollowUpDate(followUp.followUpDate) &&
      !isDueTodayFollowUpDate(followUp.followUpDate)
    ) {
      continue;
    }

    const reason: StaffWorkQueueReason = isOverdueFollowUpDate(followUp.followUpDate)
      ? "overdue_task"
      : "due_today_task";

    items.push({
      id: `task-${followUp.id}`,
      priority: REASON_PRIORITY[reason],
      reason,
      customerName: followUp.customerName,
      subtitle: followUp.reason,
      storeId: params.storeId,
      storeName: params.storeName,
      assignedStaffName: followUp.assignedStaffName,
      followUp,
      call: null,
    });
  }

  function pushCall(reason: StaffWorkQueueReason, call: StaffCallListItem) {
    items.push({
      id: `call-${call.masterSource}-${call.recordId}`,
      priority: REASON_PRIORITY[reason],
      reason,
      customerName: call.displayName,
      subtitle: call.visitSummary,
      storeId: params.storeId,
      storeName: params.storeName,
      assignedStaffName: call.staffName,
      followUp: null,
      call,
    });
  }

  for (const call of notAnswered) pushCall("not_answered", call);
  for (const call of followUpCalls) pushCall("follow_up_call", call);
  for (const call of birthdays) pushCall("birthday", call);
  for (const call of anniversaries) pushCall("anniversary", call);

  return items;
}

export { buildWorkQueueResponse };
export async function listStaffWorkQueue(params: {
  staffId: string;
  storeId: string;
  storeName?: string;
  limit?: number;
  period?: AnalyticsPeriodLabel;
}): Promise<StaffWorkQueueResponse> {
  const limit = normalizeLimit(params.limit);
  const items = await collectStoreWorkQueueItems({
    storeId: params.storeId,
    storeName: params.storeName ?? "Store",
    staffId: params.staffId,
    storeScope: false,
    limit,
    period: params.period,
  });

  return buildWorkQueueResponse(items, limit);
}

export async function listStoreWorkQueue(params: {
  storeId: string;
  storeName: string;
  limit?: number;
  period?: AnalyticsPeriodLabel;
}): Promise<StaffWorkQueueResponse> {
  const limit = normalizeLimit(params.limit);
  const items = await collectStoreWorkQueueItems({
    storeId: params.storeId,
    storeName: params.storeName,
    storeScope: true,
    limit,
    period: params.period,
  });

  return buildWorkQueueResponse(items, limit);
}

export async function listPortfolioWorkQueue(params: {
  stores: Array<{ id: string; name: string }>;
  limit?: number;
  period?: AnalyticsPeriodLabel;
}): Promise<StaffWorkQueueResponse> {
  const limit = normalizeLimit(params.limit);
  if (params.stores.length === 0) {
    return {
      items: [],
      total: 0,
      categoryTotals: {},
      storeSummaries: [],
    };
  }

  const perStore = await Promise.all(
    params.stores.map((store) =>
      collectStoreWorkQueueItems({
        storeId: store.id,
        storeName: store.name,
        storeScope: true,
        limit,
        period: params.period,
      }),
    ),
  );

  return buildWorkQueueResponse(perStore.flat(), limit);
}

export async function getStaffWorkQueueDigest(params: {
  staffId: string;
  storeId: string;
  storeName?: string;
  period?: AnalyticsPeriodLabel;
}): Promise<{ overdue: number; dueToday: number; total: number; topNames: string[] }> {
  const response = await listStaffWorkQueue({ ...params, limit: 50 });

  return {
    overdue: response.categoryTotals.overdue_task ?? 0,
    dueToday: response.categoryTotals.due_today_task ?? 0,
    total: response.total,
    topNames: response.items.slice(0, 3).map((item) => item.customerName),
  };
}

export { REASON_ORDER as STAFF_WORK_QUEUE_REASON_ORDER };
