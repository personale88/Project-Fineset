import { describe, expect, it } from "vitest";
import {
  formatCalendarDate,
  normalizeCalendarPickerDate,
  parseCalendarDate,
} from "@/lib/utils/calendar-date";
import { buildClientVisitFormValues } from "@/components/forms/VisitForm/useVisitDraft";

describe("buildClientVisitFormValues", () => {
  it("defaults sale date to today and prefills inTime for same-day logging", () => {
    const values = buildClientVisitFormValues();
    const today = formatCalendarDate(new Date());

    expect(formatCalendarDate(values.visitDate!)).toBe(today);
    expect(values.inTime).toBeInstanceOf(Date);
  });

  it("clears inTime when draft sale date is backdated", () => {
    const backdated = parseCalendarDate("2026-06-05");
    const values = buildClientVisitFormValues({
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      productsExplored: [],
      schemesPitched: ["NONE"],
      visitDate: backdated,
    });

    expect(formatCalendarDate(values.visitDate!)).toBe("2026-06-05");
    expect(values.inTime).toBeUndefined();
  });

  it("normalizes ISO draft strings without shifting the calendar day", () => {
    const values = buildClientVisitFormValues({
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      productsExplored: [],
      schemesPitched: ["NONE"],
      visitDate: "2026-06-18T18:30:00.000Z" as unknown as Date,
    });

    expect(formatCalendarDate(values.visitDate!)).toBe("2026-06-18");
  });

  it("keeps noon-normalized picker dates stable", () => {
    const pickerDate = normalizeCalendarPickerDate(new Date(2026, 5, 18, 0, 0, 0));
    const values = buildClientVisitFormValues({
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      productsExplored: [],
      schemesPitched: ["NONE"],
      visitDate: pickerDate,
    });

    expect(formatCalendarDate(values.visitDate!)).toBe("2026-06-18");
    expect(values.visitDate!.getHours()).toBe(12);
  });
});
