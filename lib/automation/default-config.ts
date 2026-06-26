import type { PlatformAutomationConfig } from "@/lib/automation/types";

export const DEFAULT_PLATFORM_AUTOMATION_CONFIG: PlatformAutomationConfig = {
  global: {
    enabled: false,
    dryRunMode: false,
    timezone: "Asia/Kolkata",
  },
  billingCycle: {
    cycleStartDay: 1,
    paymentDueDay: 10,
    gracePeriodDays: 10,
  },
  invoices: {
    autoSendEnabled: false,
    sendDayOfMonth: 1,
    daysBeforeRenewal: 0,
    sendOnRenewalDue: true,
    skipIfPaid: true,
    paymentConfirmationEnabled: true,
  },
  paymentReminders: {
    enabled: true,
    emailEnabled: true,
    whatsAppEnabled: true,
    reminderDaysBeforeDue: [3, 1, 0],
    reminderDaysAfterDue: [1, 3, 7],
    maxRemindersPerCycle: 5,
    stopAfterPayment: true,
  },
  followUps: {
    enabled: true,
    maxFollowUps: 5,
    spacingDays: [2, 3, 5, 7, 7],
    autoScheduleNext: true,
    escalateAfterMax: true,
    defaultChannel: "WHATSAPP",
  },
  expiryRenewal: {
    renewalReminderDaysBefore: [14, 7, 3, 1],
    expiryWarningDaysBefore: [7, 3, 1],
    expiryReminderEnabled: true,
    renewalReminderEnabled: true,
    autoExtendOnPayment: true,
  },
  monthlyReports: {
    enabled: false,
    sendDayOfMonth: 5,
    sendHourLocal: 9,
    recipients: "business_owners",
    includePortfolioSummary: true,
    includePerStoreMetrics: true,
    includeBillingSummary: true,
  },
  whatsApp: {
    enabled: true,
    defaultCountryCode: "91",
    businessHoursOnly: false,
    businessHoursStart: "09:00",
    businessHoursEnd: "18:00",
  },
};
