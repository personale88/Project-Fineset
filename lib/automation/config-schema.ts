import { z } from "zod";
import { isValidIanaTimezone } from "@/lib/automation/timezone";

const dayOfMonth = z.number().int().min(1).max(28);
const hourLocal = z.number().int().min(0).max(23);
const positiveDays = z.array(z.number().int().min(0).max(90)).max(10);
const timeString = z.string().regex(/^\d{2}:\d{2}$/);
const ianaTimezone = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidIanaTimezone, { message: "Invalid IANA timezone." });

const globalSchema = z.object({
  enabled: z.boolean().optional(),
  dryRunMode: z.boolean().optional(),
  timezone: ianaTimezone.optional(),
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
  reminderDaysAfterDue: positiveDays.optional(),
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
  expiryWarningDaysBefore: positiveDays.optional(),
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
  defaultCountryCode: z.string().regex(/^\d{1,4}$/).optional(),
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
});

export type AutomationConfigPatchInput = z.infer<typeof automationConfigPatchSchema>;

export const automationRunRequestSchema = z.object({
  dryRun: z.boolean().optional(),
});
