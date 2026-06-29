import type { PlatformAutomationConfig } from "@/lib/automation/types";

export type AutomationLiveRunActionKey =
  | "invoices"
  | "paymentReminderEmails"
  | "whatsAppReminders"
  | "followUps"
  | "renewalReminders"
  | "expiryWarnings"
  | "monthlyReports";

/** Configured automation actions that may send messages during a live manual run. */
export function getAutomationLiveRunActionKeys(
  config: PlatformAutomationConfig,
): AutomationLiveRunActionKey[] {
  const keys: AutomationLiveRunActionKey[] = [];

  if (config.invoices.autoSendEnabled) {
    keys.push("invoices");
  }
  if (config.paymentReminders.enabled && config.paymentReminders.emailEnabled) {
    keys.push("paymentReminderEmails");
  }
  if (
    config.paymentReminders.enabled &&
    config.paymentReminders.whatsAppEnabled &&
    config.whatsApp.enabled
  ) {
    keys.push("whatsAppReminders");
  }
  if (config.followUps.enabled && config.followUps.autoScheduleNext) {
    keys.push("followUps");
  }
  if (config.expiryRenewal.renewalReminderEnabled) {
    keys.push("renewalReminders");
  }
  if (config.expiryRenewal.expiryReminderEnabled) {
    keys.push("expiryWarnings");
  }
  if (config.monthlyReports.enabled) {
    keys.push("monthlyReports");
  }

  return keys;
}
