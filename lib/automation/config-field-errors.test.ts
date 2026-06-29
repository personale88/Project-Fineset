import { describe, expect, it } from "vitest";
import { automationConfigPatchSchema } from "@/lib/automation/config-schema";
import {
  mapAutomationSectionFieldErrors,
  mapAutomationSectionFieldErrorsFromDetails,
  mapAutomationSectionFieldErrorsFromIssues,
  resolveAutomationConfigSaveValidationErrors,
  zodErrorToFlattenDetails,
} from "@/lib/automation/config-field-errors";

describe("mapAutomationSectionFieldErrorsFromIssues", () => {
  it("maps payment reminder max count validation to field keys", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      paymentReminders: { maxRemindersPerCycle: 25 },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(mapAutomationSectionFieldErrorsFromIssues("paymentReminders", parsed.error)).toEqual({
      maxRemindersPerCycle: "Enter a whole number between 1 and 20.",
    });
  });

  it("maps WhatsApp default country code validation to field keys", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      whatsApp: { defaultCountryCode: "abc" },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(mapAutomationSectionFieldErrorsFromIssues("whatsApp", parsed.error)).toEqual({
      defaultCountryCode: "Enter 1 to 4 digits only, for example 91.",
    });
  });

  it("maps nested whatsApp business hour validation to field keys", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      whatsApp: {
        businessHoursStart: "9:00",
        businessHoursEnd: "18:00",
      },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(mapAutomationSectionFieldErrorsFromIssues("whatsApp", parsed.error)).toEqual({
      businessHoursStart: "Use HH:MM format (24-hour), for example 09:00.",
    });
  });

  it("maps each invalid business hour field separately", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      whatsApp: {
        businessHoursStart: "9:00",
        businessHoursEnd: "18:0",
      },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(mapAutomationSectionFieldErrorsFromIssues("whatsApp", parsed.error)).toEqual({
      businessHoursStart: "Use HH:MM format (24-hour), for example 09:00.",
      businessHoursEnd: "Use HH:MM format (24-hour), for example 09:00.",
    });
  });

  it("maps array item validation to the parent field key", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      paymentReminders: { reminderDaysBeforeDue: [100] },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(mapAutomationSectionFieldErrorsFromIssues("paymentReminders", parsed.error)).toEqual({
      reminderDaysBeforeDue: "Number must be less than or equal to 90",
    });
  });

  it("ignores field errors from other sections", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      global: { timezone: "Not/A_Timezone" },
      whatsApp: { businessHoursStart: "bad" },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const whatsAppErrors = mapAutomationSectionFieldErrorsFromIssues("whatsApp", parsed.error);
    expect(whatsAppErrors).toEqual({
      businessHoursStart: "Use HH:MM format (24-hour), for example 09:00.",
    });
    expect(whatsAppErrors.timezone).toBeUndefined();
  });
});

describe("zodErrorToFlattenDetails", () => {
  it("preserves dotted field paths for nested automation config errors", () => {
    const parsed = automationConfigPatchSchema.safeParse({
      whatsApp: { businessHoursStart: "9:00" },
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    expect(zodErrorToFlattenDetails(parsed.error)).toEqual({
      formErrors: [],
      fieldErrors: {
        "whatsApp.businessHoursStart": ["Use HH:MM format (24-hour), for example 09:00."],
      },
    });
  });
});

describe("mapAutomationSectionFieldErrors", () => {
  it("maps dotted field paths from API validation payloads", () => {
    expect(
      mapAutomationSectionFieldErrors("whatsApp", {
        fieldErrors: {
          "whatsApp.businessHoursStart": ["Use HH:MM format (24-hour), for example 09:00."],
        },
      }),
    ).toEqual({
      businessHoursStart: "Use HH:MM format (24-hour), for example 09:00.",
    });
  });

  it("maps indexed array field paths to the parent field key", () => {
    expect(
      mapAutomationSectionFieldErrors("paymentReminders", {
        fieldErrors: {
          "paymentReminders.reminderDaysBeforeDue.0": ["Too big: expected number to be <=90"],
        },
      }),
    ).toEqual({
      reminderDaysBeforeDue: "Too big: expected number to be <=90",
    });
  });
});

describe("mapAutomationSectionFieldErrorsFromDetails", () => {
  it("reads flattened API validation payloads", () => {
    const errors = mapAutomationSectionFieldErrorsFromDetails("whatsApp", {
      formErrors: [],
      fieldErrors: {
        "whatsApp.businessHoursStart": ["Use HH:MM format (24-hour), for example 09:00."],
      },
    });

    expect(errors).toEqual({
      businessHoursStart: "Use HH:MM format (24-hour), for example 09:00.",
    });
  });
});

describe("resolveAutomationConfigSaveValidationErrors", () => {
  it("returns mapped field errors without a toast message", () => {
    expect(
      resolveAutomationConfigSaveValidationErrors("global", {
        formErrors: [],
        fieldErrors: {
          "global.timezone": ["Invalid IANA timezone."],
        },
      }),
    ).toEqual({
      fieldErrors: { timezone: "Invalid IANA timezone." },
      message: null,
    });
  });

  it("falls back to the first validation message when no field keys match", () => {
    expect(
      resolveAutomationConfigSaveValidationErrors("global", {
        formErrors: ["At least one setting must be provided."],
        fieldErrors: {},
      }),
    ).toEqual({
      fieldErrors: {},
      message: "At least one setting must be provided.",
    });
  });
});
