import { z } from "zod";
import { isValidIanaTimezone } from "@/lib/automation/timezone";

const dayOfMonth = z.number().int().min(1).max(28);
const hourLocal = z.number().int().min(0).max(23);
const positiveDays = z
  .array(z.number().int().min(0).max(90))
  .max(10)
  .transform((days) => [...new Set(days)].sort((a, b) => b - a));
const timeString = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format (e.g. 09:00)");

const timezoneString = z
  .string()
  .min(1)
  .max(64)
  .refine((tz) => isValidIanaTimezone(tz), {
    message: "Invalid IANA timezone (e.g. Asia/Kolkata)",
  });

const globalSchema = z.object({
  enabled: z.boolean().optional(),
  dryRunMode: z.boolean().optional(),
  timezone: timezoneString.optional(),
});

const billingCycleSchema = z.object({
  cycleStartDay: dayOfMonth.optional(),
  paymentDueDay: dayOfMonth.optional(),
  gracePeriodDays: z.number().int().min(1).max(28).optional(),
});

const invoicesSchema = z.object({
  autoSendEnabled: z.boolean().optional(),
  sendDayOfMonth: dayOfMonth.optional(),
  daysBeforeRenewal: z.number().int().min(0).max(30).optional(),
  sendOnRenewalDue: z.boolean().optional(),
  skipIfPaid: z.boolean().optional(),
  paymentConfirmationEnabled: z.boolean().optional(),
});

const paymentRemindersSchema = z.object({
  enabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  whatsAppEnabled: z.boolean().optional(),
  reminderDaysBeforeDue: positiveDays.optional(),
  reminderDaysAfterDue: positiveDays
    .optional()
    .transform((days) => (days ? [...new Set(days)].sort((a, b) => a - b) : days)),
  maxRemindersPerCycle: z.number().int().min(1).max(20).optional(),
  stopAfterPayment: z.boolean().optional(),
});

const followUpsSchema = z.object({
  enabled: z.boolean().optional(),
  maxFollowUps: z.number().int().min(1).max(20).optional(),
  spacingDays: z.array(z.number().int().min(1).max(30)).max(20).optional(),
  autoScheduleNext: z.boolean().optional(),
  escalateAfterMax: z.boolean().optional(),
  defaultChannel: z.enum(["EMAIL", "WHATSAPP", "PHONE"]).optional(),
});

const expiryRenewalSchema = z.object({
  renewalReminderDaysBefore: positiveDays.optional(),
  expiryWarningDaysBefore: positiveDays
    .optional()
    .transform((days) => (days ? [...new Set(days)].sort((a, b) => a - b) : days)),
  expiryReminderEnabled: z.boolean().optional(),
  renewalReminderEnabled: z.boolean().optional(),
  autoExtendOnPayment: z.boolean().optional(),
});

const monthlyReportsSchema = z.object({
  enabled: z.boolean().optional(),
  sendDayOfMonth: dayOfMonth.optional(),
  sendHourLocal: hourLocal.optional(),
  recipients: z.enum(["business_owners", "admin_only", "both"]).optional(),
  includePortfolioSummary: z.boolean().optional(),
  includePerStoreMetrics: z.boolean().optional(),
  includeBillingSummary: z.boolean().optional(),
});

const whatsAppSchema = z.object({
  enabled: z.boolean().optional(),
  defaultCountryCode: z
    .string()
    .regex(/^\d{1,4}$/, "Country code must be 1–4 digits")
    .optional(),
  businessHoursOnly: z.boolean().optional(),
  businessHoursStart: timeString.optional(),
  businessHoursEnd: timeString.optional(),
});

export const automationConfigPatchSchema = z.object({
  global: globalSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  invoices: invoicesSchema.optional(),
  paymentReminders: paymentRemindersSchema.optional(),
  followUps: followUpsSchema.optional(),
  expiryRenewal: expiryRenewalSchema.optional(),
  monthlyReports: monthlyReportsSchema.optional(),
  whatsApp: whatsAppSchema.optional(),
  expectedUpdatedAt: z.string().datetime().optional(),
});

export type AutomationConfigPatchInput = z.infer<typeof automationConfigPatchSchema>;

export const automationRunRequestSchema = z.object({
  dryRun: z.boolean().optional(),
});

export function validateMergedAutomationConfig(
  config: {
    paymentReminders: {
      enabled: boolean;
      reminderDaysBeforeDue: number[];
      reminderDaysAfterDue: number[];
    };
  },
): { ok: true } | { ok: false; message: string; path: string[] } {
  if (!config.paymentReminders.enabled) {
    return { ok: true };
  }
  if (config.paymentReminders.reminderDaysBeforeDue.length === 0) {
    return {
      ok: false,
      message: "reminderDaysBeforeDue cannot be empty when payment reminders are enabled",
      path: ["paymentReminders", "reminderDaysBeforeDue"],
    };
  }
  if (config.paymentReminders.reminderDaysAfterDue.length === 0) {
    return {
      ok: false,
      message: "reminderDaysAfterDue cannot be empty when payment reminders are enabled",
      path: ["paymentReminders", "reminderDaysAfterDue"],
    };
  }
  return { ok: true };
}
