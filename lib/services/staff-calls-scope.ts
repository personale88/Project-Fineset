import { buildCallsPeriodRange } from "@/lib/services/call-queue-utils";
import type {
  StaffCallOccasionFilter,
  StaffCallQueue,
} from "@/types";

export interface StaffCallScopeParams {
  queue: StaffCallQueue;
  birthday: StaffCallOccasionFilter;
  anniversary: StaffCallOccasionFilter;
  year: number;
  month: number;
}

/** Occasion lists (birthday/anniversary) include all matching customers, not only this month's visits. */
export function staffCallUsesOccasionOnlyScope(params: StaffCallScopeParams): boolean {
  const hasOccasion =
    params.birthday === "THIS_MONTH" || params.anniversary === "THIS_MONTH";
  return hasOccasion && params.queue === "ALL";
}

/** Action queues include all pending records regardless of visit month or year. */
export function staffCallUsesActionQueueScope(params: StaffCallScopeParams): boolean {
  return params.queue === "NOT_ANSWERED" || params.queue === "FOLLOW_UP";
}

/** @deprecated Use staffCallUsesActionQueueScope */
export const staffCallUsesYearQueueScope = staffCallUsesActionQueueScope;

export function buildStaffCallActivityDateRange(params: StaffCallScopeParams): {
  start: Date;
  end: Date;
} | null {
  if (staffCallUsesOccasionOnlyScope(params)) {
    return null;
  }

  if (staffCallUsesActionQueueScope(params)) {
    return null;
  }

  return buildCallsPeriodRange(params.year, params.month);
}

export function matchesStaffCallActivityPeriod(
  activityDate: Date,
  params: StaffCallScopeParams,
): boolean {
  const range = buildStaffCallActivityDateRange(params);
  if (!range) return true;
  return activityDate >= range.start && activityDate <= range.end;
}
