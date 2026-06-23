export type AutomationGlobalConfig = {
  enabled: boolean;
  dryRunMode: boolean;
  timezone: string;
};

export type AutomationBillingCycleConfig = {
  cycleStartDay: number;
  paymentDueDay: number;
  gracePeriodDays: number;
};

export type AutomationInvoicesConfig = {
  autoSendEnabled: boolean;
  sendDayOfMonth: number;
  daysBeforeRenewal: number;
  sendOnRenewalDue: boolean;
  skipIfPaid: boolean;
  paymentConfirmationEnabled: boolean;
};

export type AutomationPaymentRemindersConfig = {
  enabled: boolean;
  emailEnabled: boolean;
  whatsAppEnabled: boolean;
  reminderDaysBeforeDue: number[];
  reminderDaysAfterDue: number[];
  maxRemindersPerCycle: number;
  stopAfterPayment: boolean;
};

export type AutomationFollowUpsConfig = {
  enabled: boolean;
  maxFollowUps: number;
  spacingDays: number[];
  autoScheduleNext: boolean;
  escalateAfterMax: boolean;
  defaultChannel: "EMAIL" | "WHATSAPP" | "PHONE";
};

export type AutomationExpiryRenewalConfig = {
  renewalReminderDaysBefore: number[];
  expiryWarningDaysBefore: number[];
  expiryReminderEnabled: boolean;
  renewalReminderEnabled: boolean;
  autoExtendOnPayment: boolean;
};

export type AutomationMonthlyReportsConfig = {
  enabled: boolean;
  sendDayOfMonth: number;
  sendHourLocal: number;
  recipients: "business_owners" | "admin_only" | "both";
  includePortfolioSummary: boolean;
  includePerStoreMetrics: boolean;
  includeBillingSummary: boolean;
};

export type AutomationWhatsAppConfig = {
  enabled: boolean;
  defaultCountryCode: string;
  businessHoursOnly: boolean;
  businessHoursStart: string;
  businessHoursEnd: string;
};

export type PlatformAutomationConfig = {
  global: AutomationGlobalConfig;
  billingCycle: AutomationBillingCycleConfig;
  invoices: AutomationInvoicesConfig;
  paymentReminders: AutomationPaymentRemindersConfig;
  followUps: AutomationFollowUpsConfig;
  expiryRenewal: AutomationExpiryRenewalConfig;
  monthlyReports: AutomationMonthlyReportsConfig;
  whatsApp: AutomationWhatsAppConfig;
};

export type AutomationRunSummary = {
  invoicesSent: number;
  invoicesSkipped: number;
  paymentRemindersSent: number;
  whatsAppQueued: number;
  followUpsScheduled: number;
  renewalRemindersSent: number;
  expiryWarningsSent: number;
  monthlyReportsSent: number;
  paymentConfirmationsSent: number;
  details: AutomationRunDetail[];
};

export type AutomationRunDetail = {
  action: string;
  businessKey?: string;
  businessName?: string;
  channel?: string;
  status: "success" | "skipped" | "failed" | "queued";
  message?: string;
};

export type AutomationRunLogDto = {
  id: string;
  trigger: "CRON" | "MANUAL" | "DRY_RUN";
  status: "RUNNING" | "SUCCESS" | "PARTIAL" | "FAILED";
  startedAt: string;
  completedAt: string | null;
  summary: AutomationRunSummary;
  errors: string[] | null;
  triggeredByEmail: string | null;
};
