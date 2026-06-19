import type { FollowUpListItem, StaffCallListItem } from "@/types";

export type StaffWorkQueueReason =
  | "overdue_task"
  | "due_today_task"
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
  followUp: FollowUpListItem | null;
  call: StaffCallListItem | null;
}

export interface StaffWorkQueueResponse {
  items: StaffWorkQueueItem[];
  total: number;
}
