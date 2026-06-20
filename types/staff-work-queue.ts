import type { FollowUpListItem, StaffCallListItem } from "@/types";

export type StaffWorkQueueReason =
  | "overdue_task"
  | "due_today_task"
  | "mismatched_assignment"
  | "not_answered"
  | "follow_up_call"
  | "birthday"
  | "anniversary";

export interface StaffWorkQueueItem {
  id: string;
  priority: number;
  reason: StaffWorkQueueReason;
  customerName: string;
  subtitle: string | null;
  storeId: string;
  storeName: string;
  assignedStaffName: string | null;
  followUp: FollowUpListItem | null;
  call: StaffCallListItem | null;
}

export interface StoreWorkQueueSummary {
  storeId: string;
  storeName: string;
  total: number;
}

export type StaffWorkQueueCategoryTotals = Partial<
  Record<StaffWorkQueueReason, number>
>;

export interface StaffWorkQueueResponse {
  items: StaffWorkQueueItem[];
  total: number;
  categoryTotals: StaffWorkQueueCategoryTotals;
  storeSummaries: StoreWorkQueueSummary[];
}
