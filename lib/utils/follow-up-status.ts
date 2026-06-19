import type { FollowUpStatus } from "@prisma/client";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import { isSameCalendarDay, startOfCalendarDay } from "@/lib/utils/calendar-date";

export function isOverdueFollowUpDate(followUpDate: string): boolean {
  return startOfCalendarDay(followUpDate) < startOfCalendarDay(new Date());
}

export function isDueTodayFollowUpDate(followUpDate: string): boolean {
  return isSameCalendarDay(startOfCalendarDay(followUpDate), new Date());
}

export type FollowUpStatusLabels = Record<FollowUpStatus, string>;

export function getFollowUpStatusLabel(
  status: FollowUpStatus,
  labels: FollowUpStatusLabels,
): string {
  return labels[status] ?? status;
}

export function getFollowUpStatusBadgeVariant(
  status: FollowUpStatus,
): NonNullable<VariantProps<typeof badgeVariants>["variant"]> {
  switch (status) {
    case "OPEN":
      return "warning";
    case "CLOSED":
      return "secondary";
    case "CONVERTED":
      return "success";
    case "NO_RESPONSE":
      return "error";
    default:
      return "outline";
  }
}
