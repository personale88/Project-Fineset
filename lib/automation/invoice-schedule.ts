import { startOfCalendarDay } from "@/lib/utils/billing-cycle";
import type { PlatformAutomationConfig } from "@/lib/automation/types";
import type { BusinessPortfolioRow } from "@/types";

function daysBetween(from: Date, to: Date): number {
  const a = startOfCalendarDay(from).getTime();
  const b = startOfCalendarDay(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

export function shouldSendInvoiceToday(input: {
  config: PlatformAutomationConfig;
  business: BusinessPortfolioRow;
  reference: Date;
  invoiceDay: number;
  timezone: string;
  isInvoiceDay: boolean;
}): { shouldSend: boolean; reason: string } {
  const { config, business, reference, invoiceDay, isInvoiceDay } = input;

  if (config.invoices.sendOnRenewalDue && business.renewalDueAt) {
    const renewalDate = new Date(business.renewalDueAt);
    const daysUntilRenewal = daysBetween(reference, renewalDate);
    if (daysUntilRenewal === config.invoices.daysBeforeRenewal) {
      return {
        shouldSend: true,
        reason: `Renewal due in ${config.invoices.daysBeforeRenewal} day(s)`,
      };
    }
    if (daysUntilRenewal === 0 && isInvoiceDay) {
      return { shouldSend: true, reason: "Renewal due today" };
    }
  }

  if (isInvoiceDay) {
    return { shouldSend: true, reason: `Scheduled invoice day (${invoiceDay})` };
  }

  return { shouldSend: false, reason: "Not scheduled for today" };
}
