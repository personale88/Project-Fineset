import type { StaffCallMasterSource } from "@/types";

export type OverdueAlertCategory = "calls" | "birthdays" | "anniversaries";

export type OverdueAlertReason =
  | "FOLLOW_UP_OVERDUE"
  | "NOT_ANSWERED"
  | "OPEN_FOLLOW_UP"
  | "BIRTHDAY"
  | "ANNIVERSARY";

export interface OverdueAlertItem {
  id: string;
  category: OverdueAlertCategory;
  reason: OverdueAlertReason;
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  staffId: string;
  staffName: string;
  customerName: string;
  customerPhone: string;
  missedDate: string;
  recordId: string | null;
  masterSource: StaffCallMasterSource | null;
}

/** @deprecated Aggregated staff view — use OverdueAlertItem */
export interface StaffMissedSummary {
  storeId: string;
  storeName: string;
  storeCity: string;
  storeState: string;
  staffId: string;
  staffName: string;
  missedCalls: number;
  missedBirthdays: number;
  missedAnniversaries: number;
}

export function staffMissedTotal(summary: StaffMissedSummary): number {
  return summary.missedCalls + summary.missedBirthdays + summary.missedAnniversaries;
}
