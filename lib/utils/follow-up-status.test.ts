import { describe, expect, it } from "vitest";
import {
  isDueTodayFollowUpDate,
  isOverdueFollowUpDate,
} from "@/lib/utils/follow-up-status";
import { formatCalendarDate } from "@/lib/utils/calendar-date";

describe("follow-up-status dates", () => {
  it("marks past calendar dates as overdue", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isOverdueFollowUpDate(formatCalendarDate(yesterday))).toBe(true);
  });

  it("marks today as due today but not overdue", () => {
    const today = formatCalendarDate(new Date());
    expect(isDueTodayFollowUpDate(today)).toBe(true);
    expect(isOverdueFollowUpDate(today)).toBe(false);
  });
});
