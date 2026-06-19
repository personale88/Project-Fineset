import { listFollowUps } from "@/lib/services/follow-ups";
import { listStaffCalls } from "@/lib/services/staff-calls";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import type { StaffCallListItem } from "@/types";
import type { StaffWorkQueueItem, StaffWorkQueueReason } from "@/types/staff-work-queue";

export type { StaffWorkQueueItem, StaffWorkQueueReason, StaffWorkQueueResponse } from "@/types/staff-work-queue";

const REASON_PRIORITY: Record<StaffWorkQueueReason, number> = {
  overdue_task: 1,
  due_today_task: 2,
  not_answered: 3,
  follow_up_call: 4,
  birthday: 5,
  anniversary: 6,
};

function dedupeKey(item: StaffWorkQueueItem): string {
  if (item.followUp) return `follow-up:${item.followUp.id}`;
  if (item.call) return `call:${item.call.masterSource}:${item.call.recordId}`;
  return item.id;
}

export async function listStaffWorkQueue(params: {
  staffId: string;
  storeId: string;
  limit?: number;
}): Promise<{ items: StaffWorkQueueItem[]; total: number }> {
  const limit = params.limit ?? 15;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [openFollowUps, notAnswered, followUpCalls, birthdays, anniversaries] =
    await Promise.all([
      listFollowUps({
        storeId: params.storeId,
        staffId: params.staffId,
        status: "OPEN",
      }),
      listStaffCalls({
        staffId: params.staffId,
        storeId: params.storeId,
        master: "ALL",
        segment: "ALL",
        valueTier: "ALL",
        queue: "NOT_ANSWERED",
        birthday: "ALL",
        anniversary: "ALL",
        year,
        month,
        page: 1,
        pageSize: limit,
      }),
      listStaffCalls({
        staffId: params.staffId,
        storeId: params.storeId,
        master: "ALL",
        segment: "ALL",
        valueTier: "ALL",
        queue: "FOLLOW_UP",
        birthday: "ALL",
        anniversary: "ALL",
        year,
        month,
        page: 1,
        pageSize: limit,
      }),
      listStaffCalls({
        staffId: params.staffId,
        storeId: params.storeId,
        master: "ALL",
        segment: "ALL",
        valueTier: "ALL",
        queue: "ALL",
        birthday: "THIS_MONTH",
        anniversary: "ALL",
        year,
        month,
        page: 1,
        pageSize: limit,
      }),
      listStaffCalls({
        staffId: params.staffId,
        storeId: params.storeId,
        master: "ALL",
        segment: "ALL",
        valueTier: "ALL",
        queue: "ALL",
        birthday: "ALL",
        anniversary: "THIS_MONTH",
        year,
        month,
        page: 1,
        pageSize: limit,
      }),
    ]);

  const items: StaffWorkQueueItem[] = [];

  for (const followUp of openFollowUps) {
    if (
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
      followUp: null,
      call,
    });
  }

  for (const call of notAnswered.data) pushCall("not_answered", call);
  for (const call of followUpCalls.data) pushCall("follow_up_call", call);
  for (const call of birthdays.data) pushCall("birthday", call);
  for (const call of anniversaries.data) pushCall("anniversary", call);

  const seen = new Set<string>();
  const merged = items
    .sort((a, b) => a.priority - b.priority)
    .filter((item) => {
      const key = dedupeKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    items: merged.slice(0, limit),
    total: merged.length,
  };
}

export async function getStaffWorkQueueDigest(params: {
  staffId: string;
  storeId: string;
}): Promise<{ overdue: number; dueToday: number; total: number; topNames: string[] }> {
  const { items, total } = await listStaffWorkQueue({ ...params, limit: 50 });
  const overdue = items.filter((item) => item.reason === "overdue_task").length;
  const dueToday = items.filter((item) => item.reason === "due_today_task").length;

  return {
    overdue,
    dueToday,
    total,
    topNames: items.slice(0, 3).map((item) => item.customerName),
  };
}
