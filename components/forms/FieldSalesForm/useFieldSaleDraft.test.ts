import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "@/lib/utils/calendar-date";
import {
  formatTimeForInput,
  type FieldSalesFormValues,
} from "@/components/forms/FieldSalesForm/FieldSalesForm.types";
import { buildClientFieldSaleFormValues } from "@/components/forms/FieldSalesForm/useFieldSaleDraft";

describe("buildClientFieldSaleFormValues", () => {
  it("normalizes ISO draft date strings without shifting the calendar day", () => {
    const values = buildClientFieldSaleFormValues({
      activityDate: "2026-06-18T18:30:00.000Z" as unknown as Date,
    });

    expect(formatCalendarDate(values.activityDate!)).toBe("2026-06-18");
  });

  it("normalizes ISO draft time strings for activity fields", () => {
    const values = buildClientFieldSaleFormValues({
      startTime: "2026-06-18T04:30:00.000Z" as unknown as Date,
      endTime: "2026-06-18T06:15:00.000Z" as unknown as Date,
    });

    expect(values.startTime).toBeInstanceOf(Date);
    expect(values.endTime).toBeInstanceOf(Date);
    expect(formatTimeForInput(values.startTime!)).toMatch(/^\d{2}:\d{2}$/);
    expect(formatTimeForInput(values.endTime!)).toMatch(/^\d{2}:\d{2}$/);
  });

  it("defaults schemesPitched to an empty array when draft data is invalid", () => {
    const values = buildClientFieldSaleFormValues({
      schemesPitched: null as unknown as FieldSalesFormValues["schemesPitched"],
    });

    expect(values.schemesPitched).toEqual([]);
  });
});
