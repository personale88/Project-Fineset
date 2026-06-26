import { prisma } from "@/lib/db/prisma";
import {
  createAutomationRunLog,
  completeAutomationRunLog,
  getAutomationConfig,
  assertNoActiveAutomationRun,
  AutomationDisabledError,
} from "@/lib/services/automation-config";
import { sendBusinessInvoice } from "@/lib/services/send-business-invoice";
import { createBillingFollowUp, getBillingSummaries } from "@/lib/services/billing-accounts";
import { toBillingCycleSettings } from "@/lib/automation/merge-config";
import { computeAdminPortfolioKpis } from "@/lib/utils/admin-portfolio-kpis";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  buildAutomationDedupeKey,
  countAutomationDeliveries,
  recordAutomationDelivery,
  wasAutomationDelivered,
} from "@/lib/automation/delivery-log";
import { shouldSendInvoiceToday } from "@/lib/automation/invoice-schedule";
import {
  billingCycleMonthKeyInTimezone,
  isValidIanaTimezone,
  isWithinBusinessHoursInTimezone,
  shouldRunOnDayInTimezone,
  shouldRunMonthlyReportWindow,
} from "@/lib/automation/timezone";
import { isSmtpConfigured } from "@/lib/email/env";
import {
  sendExpiryWarningEmail,
  sendMonthlyReportEmail,
  sendPaymentConfirmationEmail,
  sendPaymentReminderEmail,
  sendRenewalReminderEmail,
} from "@/lib/emails/automation-emails";
import {
  getBillingCycleStart,
  getPaymentDeadline,
  startOfCalendarDay,
} from "@/lib/utils/billing-cycle";
import { getBusinessPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import { getPlatformBranding } from "@/lib/platform/branding";
import { getActiveBillingPricingConfig } from "@/lib/platform/billing-pricing";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import { buildBillingWhatsAppReminderMessage } from "@/lib/services/send-billing-whatsapp-reminder";
import { resolveBusinessPhone } from "@/lib/utils/group-stores-by-business";
import {
  isWhatsAppApiConfigured,
  sendWhatsAppTextMessage,
} from "@/lib/whatsapp/send-message";
import { escapeHtml } from "@/lib/utils/escape-html";
import { captureServerError } from "@/lib/monitoring/capture-error";
import type {
  AutomationRunDetail,
  AutomationRunResult,
  AutomationRunSummary,
  PlatformAutomationConfig,
} from "@/lib/automation/types";
import type { AutomationRunTrigger } from "@prisma/client";
import type { BusinessPortfolioRow } from "@/types";

function buildMonthlyReportBody(
  reportLines: string[],
): string {
  return reportLines.join("\n");
}

function buildMonthlyReportHtml(reportLines: string[]): string {
  const escaped = reportLines.map((line) => escapeHtml(line)).join("\n");
  return `<pre style="font-family: sans-serif; white-space: pre-wrap;">${escaped}</pre>`;
}
function daysBetween(from: Date, to: Date): number {
  const a = startOfCalendarDay(from).getTime();
  const b = startOfCalendarDay(to).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

function isWithinBusinessHours(config: PlatformAutomationConfig, reference: Date): boolean {
  if (!config.whatsApp.businessHoursOnly) return true;
  return isWithinBusinessHoursInTimezone(
    config.global.timezone,
    config.whatsApp.businessHoursStart,
    config.whatsApp.businessHoursEnd,
    reference,
  );
}

async function skipIfAlreadyDelivered(input: {
  dedupeKey: string;
  dryRun: boolean;
  summary: AutomationRunSummary;
  detail: AutomationRunDetail;
}): Promise<boolean> {
  if (input.dryRun) return false;
  if (await wasAutomationDelivered(input.dedupeKey)) {
    addDetail(input.summary, {
      ...input.detail,
      status: "skipped",
      message: "Already sent for this billing period",
    });
    return true;
  }
  return false;
}

function addDetail(
  summary: AutomationRunSummary,
  detail: AutomationRunDetail,
): void {
  summary.details.push(detail);
}

async function runInvoiceAutomation(
  config: PlatformAutomationConfig,
  businesses: BusinessPortfolioRow[],
  reference: Date,
  dryRun: boolean,
  summary: AutomationRunSummary,
  errors: string[],
): Promise<void> {
  if (!config.invoices.autoSendEnabled) return;

  const cycleSettings = toBillingCycleSettings(config);
  const timezone = config.global.timezone;
  const invoiceDay =
    config.invoices.sendDayOfMonth || cycleSettings.cycleStartDay;
  const isInvoiceDay = shouldRunOnDayInTimezone(invoiceDay, timezone, reference);
  const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);

  const needsEmail = true;
  if (!dryRun && needsEmail && !isSmtpConfigured()) {
    errors.push("SMTP is not configured — invoice automation skipped.");
    return;
  }

  const summaries = await getBillingSummaries();
  const summaryByKey = new Map(summaries.map((row) => [row.businessKey, row]));

  for (const business of businesses) {
    const schedule = shouldSendInvoiceToday({
      config,
      business,
      reference,
      invoiceDay,
      timezone,
      isInvoiceDay,
    });
    if (!schedule.shouldSend) {
      continue;
    }

    const billingSummary = summaryByKey.get(business.businessKey);
    const paymentStatus = billingSummary?.paymentStatus ?? "UNPAID";

    if (config.invoices.skipIfPaid) {
      if (paymentStatus === "PAID" || paymentStatus === "WAIVED") {
        summary.invoicesSkipped += 1;
        addDetail(summary, {
          action: "invoice",
          businessKey: business.businessKey,
          businessName: business.businessName,
          status: "skipped",
          message: "Already paid for current cycle",
        });
        continue;
      }

      const status = getBusinessPaymentStatus(
        business,
        reference,
        paymentStatus,
        undefined,
        cycleSettings,
      );
      if (status === "CURRENT") {
        summary.invoicesSkipped += 1;
        addDetail(summary, {
          action: "invoice",
          businessKey: business.businessKey,
          businessName: business.businessName,
          status: "skipped",
          message: "Already paid for current cycle",
        });
        continue;
      }
    }

    if (!business.businessEmail?.trim()) {
      summary.invoicesSkipped += 1;
      addDetail(summary, {
        action: "invoice",
        businessKey: business.businessKey,
        businessName: business.businessName,
        status: "skipped",
        message: "No business email",
      });
      continue;
    }

    const dedupeKey = buildAutomationDedupeKey([
      business.businessKey,
      "INVOICE",
      cycleKey,
      schedule.reason,
    ]);
    if (
      await skipIfAlreadyDelivered({
        dedupeKey,
        dryRun,
        summary,
        detail: {
          action: "invoice",
          businessKey: business.businessKey,
          businessName: business.businessName,
          channel: "EMAIL",
          status: "skipped",
        },
      })
    ) {
      continue;
    }

    if (dryRun) {
      addDetail(summary, {
        action: "invoice",
        businessKey: business.businessKey,
        businessName: business.businessName,
        channel: "EMAIL",
        status: "queued",
        message: schedule.reason,
      });
      continue;
    }

    try {
      await sendBusinessInvoice(business.businessKey, "automation@fineset.local");
      await recordAutomationDelivery({
        businessKey: business.businessKey,
        actionType: "INVOICE",
        dedupeKey,
        channel: "EMAIL",
        status: "SUCCESS",
        message: schedule.reason,
      });
      summary.invoicesSent += 1;
      addDetail(summary, {
        action: "invoice",
        businessKey: business.businessKey,
        businessName: business.businessName,
        channel: "EMAIL",
        status: "success",
        message: schedule.reason,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invoice send failed";
      errors.push(`${business.businessName}: ${message}`);
      addDetail(summary, {
        action: "invoice",
        businessKey: business.businessKey,
        businessName: business.businessName,
        status: "failed",
        message,
      });
    }
  }
}

async function runPaymentReminderAutomation(
  config: PlatformAutomationConfig,
  businesses: BusinessPortfolioRow[],
  reference: Date,
  dryRun: boolean,
  summary: AutomationRunSummary,
  errors: string[],
): Promise<void> {
  if (!config.paymentReminders.enabled) return;

  const pricingConfig = await getActiveBillingPricingConfig();
  const cycleSettings = toBillingCycleSettings(config);
  const timezone = config.global.timezone;
  const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);
  const deadline = getPaymentDeadline(reference, cycleSettings);
  const daysUntilDue = daysBetween(reference, deadline);

  const beforeDue = config.paymentReminders.reminderDaysBeforeDue.includes(
    daysUntilDue,
  );
  const afterDue =
    daysUntilDue < 0 &&
    config.paymentReminders.reminderDaysAfterDue.includes(Math.abs(daysUntilDue));

  if (!beforeDue && !afterDue) return;

  const variant = beforeDue ? `before_${daysUntilDue}` : `after_${Math.abs(daysUntilDue)}`;
  const emailReady = dryRun || isSmtpConfigured();
  if (!emailReady && config.paymentReminders.emailEnabled) {
    errors.push("SMTP is not configured — payment reminder emails were skipped.");
  }

  const summaries = await getBillingSummaries();
  const summaryByKey = new Map(summaries.map((row) => [row.businessKey, row]));

  for (const business of businesses) {
    const billingSummary = summaryByKey.get(business.businessKey);
    const paymentStatus = billingSummary?.paymentStatus ?? "UNPAID";
    if (
      config.paymentReminders.stopAfterPayment &&
      (paymentStatus === "PAID" || paymentStatus === "WAIVED")
    ) {
      continue;
    }

    const portfolioStatus = getBusinessPaymentStatus(
      business,
      reference,
      paymentStatus,
      undefined,
      cycleSettings,
    );
    if (portfolioStatus === "CURRENT") continue;

    const sentThisCycle = await countAutomationDeliveries({
      businessKey: business.businessKey,
      actionType: "PAYMENT_REMINDER",
      cycleKey,
    });
    if (sentThisCycle >= config.paymentReminders.maxRemindersPerCycle) {
      addDetail(summary, {
        action: "payment_reminder",
        businessKey: business.businessKey,
        businessName: business.businessName,
        status: "skipped",
        message: "Max reminders reached for this cycle",
      });
      continue;
    }

    const email = business.businessEmail?.trim();
    const billing = calculateBusinessMonthlyBilling(business.stores, pricingConfig);
    const amountInr = billing.grandTotal;

    if (config.paymentReminders.emailEnabled && email && emailReady) {
      const dedupeKey = buildAutomationDedupeKey([
        business.businessKey,
        "PAYMENT_REMINDER",
        cycleKey,
        variant,
      ]);
      if (
        await skipIfAlreadyDelivered({
          dedupeKey,
          dryRun,
          summary,
          detail: {
            action: "payment_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "EMAIL",
            status: "skipped",
          },
        })
      ) {
        continue;
      }

      if (dryRun) {
        addDetail(summary, {
          action: "payment_reminder",
          businessKey: business.businessKey,
          businessName: business.businessName,
          channel: "EMAIL",
          status: "queued",
          message: `Would remind (${daysUntilDue}d to due)`,
        });
      } else {
        try {
          await sendPaymentReminderEmail({
            to: email,
            businessName: business.businessName,
            amountInr,
            dueDate: deadline,
            daysUntilDue,
          });
          await recordAutomationDelivery({
            businessKey: business.businessKey,
            actionType: "PAYMENT_REMINDER",
            dedupeKey,
            channel: "EMAIL",
            status: "SUCCESS",
          });
          summary.paymentRemindersSent += 1;
          addDetail(summary, {
            action: "payment_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "EMAIL",
            status: "success",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Reminder email failed";
          errors.push(`${business.businessName}: ${message}`);
          addDetail(summary, {
            action: "payment_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "EMAIL",
            status: "failed",
            message,
          });
        }
      }
    }

    if (
      config.paymentReminders.whatsAppEnabled &&
      config.whatsApp.enabled &&
      isWithinBusinessHours(config, reference)
    ) {
      const dedupeKey = buildAutomationDedupeKey([
        business.businessKey,
        "WHATSAPP_REMINDER",
        cycleKey,
        variant,
      ]);
      if (
        await skipIfAlreadyDelivered({
          dedupeKey,
          dryRun,
          summary,
          detail: {
            action: "whatsapp_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "WHATSAPP",
            status: "skipped",
          },
        })
      ) {
        continue;
      }

      const message = buildBillingWhatsAppReminderMessage(
        business,
        cycleSettings,
        pricingConfig,
      );
      const phone = resolveBusinessPhone(business.stores);
      const countryCode = config.whatsApp.defaultCountryCode;
      const nextFollowUpAt = new Date(reference);
      nextFollowUpAt.setDate(nextFollowUpAt.getDate() + 1);

      if (dryRun) {
        summary.whatsAppQueued += 1;
        addDetail(summary, {
          action: "whatsapp_reminder",
          businessKey: business.businessKey,
          businessName: business.businessName,
          channel: "WHATSAPP",
          status: "queued",
          message: isWhatsAppApiConfigured()
            ? "Would send WhatsApp reminder"
            : "Would queue WhatsApp follow-up",
        });
      } else if (!phone) {
        addDetail(summary, {
          action: "whatsapp_reminder",
          businessKey: business.businessKey,
          businessName: business.businessName,
          channel: "WHATSAPP",
          status: "skipped",
          message: "No phone number on file",
        });
      } else if (isWhatsAppApiConfigured()) {
        try {
          await sendWhatsAppTextMessage({
            toPhone: phone,
            message,
            defaultCountryCode: countryCode,
          });
          await recordAutomationDelivery({
            businessKey: business.businessKey,
            actionType: "WHATSAPP_REMINDER",
            dedupeKey,
            channel: "WHATSAPP",
            status: "SUCCESS",
          });
          summary.whatsAppSent += 1;
          addDetail(summary, {
            action: "whatsapp_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "WHATSAPP",
            status: "success",
            message: "WhatsApp reminder sent",
          });
        } catch (error) {
          const errMessage =
            error instanceof Error ? error.message : "WhatsApp send failed";
          errors.push(`${business.businessName}: ${errMessage}`);
          addDetail(summary, {
            action: "whatsapp_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "WHATSAPP",
            status: "failed",
            message: errMessage,
          });
        }
      } else {
        try {
          await createBillingFollowUp({
            businessKey: business.businessKey,
            channel: "WHATSAPP",
            outcome: "RESCHEDULED",
            notes: `[Automation] WhatsApp reminder queued. ${message.slice(0, 400)}`,
            nextFollowUpAt,
            createdByEmail: "automation@fineset.local",
            createdByName: "Automation",
          });
          await recordAutomationDelivery({
            businessKey: business.businessKey,
            actionType: "WHATSAPP_REMINDER",
            dedupeKey,
            channel: "WHATSAPP",
            status: "QUEUED",
          });
          summary.whatsAppQueued += 1;
          addDetail(summary, {
            action: "whatsapp_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "WHATSAPP",
            status: "success",
            message: "Follow-up scheduled — WhatsApp API unavailable",
          });
        } catch (error) {
          const errMessage =
            error instanceof Error ? error.message : "WhatsApp queue failed";
          errors.push(`${business.businessName}: ${errMessage}`);
        }
      }
    }
  }
}

async function runFollowUpScheduling(
  config: PlatformAutomationConfig,
  reference: Date,
  dryRun: boolean,
  summary: AutomationRunSummary,
  errors: string[],
): Promise<void> {
  if (!config.followUps.enabled || !config.followUps.autoScheduleNext) return;

  const dueAccounts = await prisma.billingBusinessAccount.findMany({
    where: {
      nextFollowUpAt: { lte: reference },
      paymentStatus: { in: ["UNPAID", "PARTIAL", "DISPUTED"] },
    },
    select: {
      businessKey: true,
      businessName: true,
    },
  });

  for (const account of dueAccounts) {
    const followUpCount = await prisma.billingFollowUp.count({
      where: { account: { businessKey: account.businessKey } },
    });

    if (followUpCount >= config.followUps.maxFollowUps) {
      if (config.followUps.escalateAfterMax) {
        addDetail(summary, {
          action: "follow_up_escalation",
          businessKey: account.businessKey,
          businessName: account.businessName,
          status: "skipped",
          message: "Max follow-ups reached — needs manual review",
        });
      }
      continue;
    }

    const spacing =
      config.followUps.spacingDays[
        Math.min(followUpCount, config.followUps.spacingDays.length - 1)
      ] ?? 3;
    const nextDate = new Date(reference);
    nextDate.setDate(nextDate.getDate() + spacing);

    if (dryRun) {
      addDetail(summary, {
        action: "follow_up_schedule",
        businessKey: account.businessKey,
        businessName: account.businessName,
        channel: config.followUps.defaultChannel,
        status: "queued",
        message: `Would schedule next follow-up in ${spacing} days`,
      });
      continue;
    }

    try {
      await createBillingFollowUp({
        businessKey: account.businessKey,
        channel: config.followUps.defaultChannel,
        outcome: "RESCHEDULED",
        notes: "[Automation] Scheduled follow-up reminder.",
        nextFollowUpAt: nextDate,
        createdByEmail: "automation@fineset.local",
        createdByName: "Automation",
      });
      summary.followUpsScheduled += 1;
      addDetail(summary, {
        action: "follow_up_schedule",
        businessKey: account.businessKey,
        businessName: account.businessName,
        channel: config.followUps.defaultChannel,
        status: "success",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Follow-up scheduling failed";
      errors.push(`${account.businessName}: ${message}`);
    }
  }
}

async function runExpiryRenewalReminders(
  config: PlatformAutomationConfig,
  businesses: BusinessPortfolioRow[],
  reference: Date,
  dryRun: boolean,
  summary: AutomationRunSummary,
  errors: string[],
): Promise<void> {
  const timezone = config.global.timezone;
  const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);
  const emailReady = dryRun || isSmtpConfigured();

  for (const business of businesses) {
    const email = business.businessEmail?.trim();
    if (!email) continue;

    if (config.expiryRenewal.renewalReminderEnabled && business.renewalDueAt) {
      const renewalDate = new Date(business.renewalDueAt);
      const daysUntil = daysBetween(reference, renewalDate);
      if (
        daysUntil >= 0 &&
        config.expiryRenewal.renewalReminderDaysBefore.includes(daysUntil)
      ) {
        const dedupeKey = buildAutomationDedupeKey([
          business.businessKey,
          "RENEWAL_REMINDER",
          cycleKey,
          String(daysUntil),
        ]);
        if (
          await skipIfAlreadyDelivered({
            dedupeKey,
            dryRun,
            summary,
            detail: {
              action: "renewal_reminder",
              businessKey: business.businessKey,
              businessName: business.businessName,
              channel: "EMAIL",
              status: "skipped",
            },
          })
        ) {
          continue;
        }

        if (dryRun) {
          addDetail(summary, {
            action: "renewal_reminder",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "EMAIL",
            status: "queued",
            message: `Renewal in ${daysUntil} day(s)`,
          });
        } else if (!emailReady) {
          errors.push("SMTP is not configured — renewal reminders were skipped.");
        } else {
          try {
            await sendRenewalReminderEmail({
              to: email,
              businessName: business.businessName,
              renewalDate,
              daysUntilRenewal: daysUntil,
            });
            await recordAutomationDelivery({
              businessKey: business.businessKey,
              actionType: "RENEWAL_REMINDER",
              dedupeKey,
              channel: "EMAIL",
              status: "SUCCESS",
            });
            summary.renewalRemindersSent += 1;
          } catch (error) {
            errors.push(
              `${business.businessName}: ${
                error instanceof Error ? error.message : "Renewal reminder failed"
              }`,
            );
          }
        }
      }
    }

    if (config.expiryRenewal.expiryReminderEnabled && business.dataExpiryAt) {
      const expiryDate = new Date(business.dataExpiryAt);
      const daysUntil = daysBetween(reference, expiryDate);
      if (
        daysUntil >= 0 &&
        config.expiryRenewal.expiryWarningDaysBefore.includes(daysUntil)
      ) {
        const dedupeKey = buildAutomationDedupeKey([
          business.businessKey,
          "EXPIRY_WARNING",
          cycleKey,
          String(daysUntil),
        ]);
        if (
          await skipIfAlreadyDelivered({
            dedupeKey,
            dryRun,
            summary,
            detail: {
              action: "expiry_warning",
              businessKey: business.businessKey,
              businessName: business.businessName,
              channel: "EMAIL",
              status: "skipped",
            },
          })
        ) {
          continue;
        }

        if (dryRun) {
          addDetail(summary, {
            action: "expiry_warning",
            businessKey: business.businessKey,
            businessName: business.businessName,
            channel: "EMAIL",
            status: "queued",
            message: `Expiry in ${daysUntil} day(s)`,
          });
        } else if (!emailReady) {
          errors.push("SMTP is not configured — expiry warnings were skipped.");
        } else {
          try {
            await sendExpiryWarningEmail({
              to: email,
              businessName: business.businessName,
              expiryDate,
              daysUntilExpiry: daysUntil,
            });
            await recordAutomationDelivery({
              businessKey: business.businessKey,
              actionType: "EXPIRY_WARNING",
              dedupeKey,
              channel: "EMAIL",
              status: "SUCCESS",
            });
            summary.expiryWarningsSent += 1;
          } catch (error) {
            errors.push(
              `${business.businessName}: ${
                error instanceof Error ? error.message : "Expiry warning failed"
              }`,
            );
          }
        }
      }
    }
  }
}

async function runMonthlyReports(
  config: PlatformAutomationConfig,
  businesses: BusinessPortfolioRow[],
  reference: Date,
  dryRun: boolean,
  summary: AutomationRunSummary,
  errors: string[],
): Promise<void> {
  if (!config.monthlyReports.enabled) return;

  const timezone = config.global.timezone;
  if (!shouldRunOnDayInTimezone(config.monthlyReports.sendDayOfMonth, timezone, reference)) {
    return;
  }
  if (!shouldRunMonthlyReportWindow(config.monthlyReports.sendHourLocal, timezone, reference)) {
    return;
  }

  const cycleSettings = toBillingCycleSettings(config);
  const cycleKey = billingCycleMonthKeyInTimezone(timezone, reference);
  const cycleStart = getBillingCycleStart(reference, cycleSettings);
  const branding = await getPlatformBranding();
  const reportLines = [
    `${branding.platformName} Monthly Report — ${reference.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: timezone })}`,
    `Billing cycle started: ${cycleStart.toLocaleDateString("en-IN", { timeZone: timezone })}`,
    "",
  ];

  if (config.monthlyReports.includePortfolioSummary) {
    reportLines.push(`Active businesses: ${businesses.length}`);
    reportLines.push(
      `Unpaid accounts: ${businesses.filter((b) => getBusinessPaymentStatus(b, reference, undefined, undefined, cycleSettings) !== "CURRENT").length}`,
    );
    reportLines.push("");
  }

  if (config.monthlyReports.includeBillingSummary) {
    const summaries = await getBillingSummaries();
    const billingKpis = computeAdminPortfolioKpis(
      businesses,
      summaries,
      reference,
      cycleSettings,
    );
    const counts = billingKpis.paymentStatusCounts;
    reportLines.push("Billing summary:");
    reportLines.push(`MRR: ${formatCurrency(billingKpis.mrr)}`);
    reportLines.push(`At-risk MRR: ${formatCurrency(billingKpis.atRiskMrr)}`);
    reportLines.push(`Unpaid billing records: ${billingKpis.unpaidBillingCount}`);
    reportLines.push(`Follow-ups due: ${billingKpis.followUpsDueCount}`);
    reportLines.push(
      `Status — Current: ${counts.CURRENT}, Due soon: ${counts.DUE_SOON}, Overdue: ${counts.OVERDUE}, Expired: ${counts.EXPIRED}, Not set: ${counts.UNKNOWN}`,
    );
    reportLines.push("");
  }

  if (config.monthlyReports.includePerStoreMetrics) {
    for (const business of businesses.slice(0, 50)) {
      const staffTotal = business.stores.reduce(
        (sum, store) => sum + store.staffCount,
        0,
      );
      reportLines.push(
        `• ${business.businessName} — ${business.stores.length} store(s), ${staffTotal} staff`,
      );
    }
    if (businesses.length > 50) {
      reportLines.push(`… and ${businesses.length - 50} more`);
    }
    reportLines.push("");
  }

  const bodyText = buildMonthlyReportBody(reportLines);
  const bodyHtml = buildMonthlyReportHtml(reportLines);
  const subject = `${branding.platformName} monthly report — ${reference.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: timezone })}`;

  const recipients = new Set<string>();
  const needsAdminRecipient =
    config.monthlyReports.recipients === "admin_only" ||
    config.monthlyReports.recipients === "both";
  const adminEmail = process.env.MASTER_ADMIN_EMAIL?.trim();

  if (needsAdminRecipient) {
    if (adminEmail) {
      recipients.add(adminEmail);
    } else {
      errors.push(
        "Monthly report recipients include admin but MASTER_ADMIN_EMAIL is not configured.",
      );
    }
  }
  if (
    config.monthlyReports.recipients === "business_owners" ||
    config.monthlyReports.recipients === "both"
  ) {
    for (const business of businesses) {
      const email = business.businessEmail?.trim().toLowerCase();
      if (email) recipients.add(email);
    }
  }

  for (const to of recipients) {
    const dedupeKey = buildAutomationDedupeKey([
      "MONTHLY_REPORT",
      cycleKey,
      to.toLowerCase(),
    ]);
    if (
      await skipIfAlreadyDelivered({
        dedupeKey,
        dryRun,
        summary,
        detail: {
          action: "monthly_report",
          channel: "EMAIL",
          status: "skipped",
          message: `Already sent to ${to}`,
        },
      })
    ) {
      continue;
    }

    if (dryRun) {
      addDetail(summary, {
        action: "monthly_report",
        channel: "EMAIL",
        status: "queued",
        message: `Would send to ${to}`,
      });
      continue;
    }
    if (!isSmtpConfigured()) {
      errors.push("SMTP is not configured — monthly reports were skipped.");
      break;
    }
    try {
      await sendMonthlyReportEmail({ to, subject, bodyText, bodyHtml });
      await recordAutomationDelivery({
        actionType: "MONTHLY_REPORT",
        dedupeKey,
        channel: "EMAIL",
        status: "SUCCESS",
        message: to,
      });
      summary.monthlyReportsSent += 1;
      addDetail(summary, {
        action: "monthly_report",
        channel: "EMAIL",
        status: "success",
        message: `Sent to ${to}`,
      });
    } catch (error) {
      errors.push(
        `${to}: ${error instanceof Error ? error.message : "Monthly report failed"}`,
      );
    }
  }
}

export async function runBillingAutomation(input: {
  trigger: AutomationRunTrigger;
  dryRun?: boolean;
  triggeredByEmail?: string | null;
}): Promise<AutomationRunResult> {
  const config = await getAutomationConfig({ fresh: true });
  const dryRunForced = input.dryRun !== true && config.global.dryRunMode;
  const dryRun = input.dryRun === true || dryRunForced;

  if (!config.global.enabled && !dryRun) {
    if (input.trigger === "MANUAL") {
      throw new AutomationDisabledError();
    }

    const summary: AutomationRunSummary = {
      invoicesSent: 0,
      invoicesSkipped: 0,
      paymentRemindersSent: 0,
      whatsAppQueued: 0,
      whatsAppSent: 0,
      followUpsScheduled: 0,
      renewalRemindersSent: 0,
      expiryWarningsSent: 0,
      monthlyReportsSent: 0,
      paymentConfirmationsSent: 0,
      details: [
        {
          action: "skipped",
          status: "skipped",
          message: "Automations are disabled in Automation Center",
        },
      ],
    };
    const { id: runId } = await createAutomationRunLog({
      trigger: input.trigger,
      triggeredByEmail: input.triggeredByEmail,
    });
    await completeAutomationRunLog(runId, {
      status: "SUCCESS",
      summary,
    });
    return { runId, status: "SUCCESS", summary, errors: [] };
  }

  if (!isValidIanaTimezone(config.global.timezone)) {
    await assertNoActiveAutomationRun();
    const { id: runId } = await createAutomationRunLog({
      trigger: dryRun ? "DRY_RUN" : input.trigger,
      triggeredByEmail: input.triggeredByEmail,
    });
    const summary: AutomationRunSummary = {
      invoicesSent: 0,
      invoicesSkipped: 0,
      paymentRemindersSent: 0,
      whatsAppQueued: 0,
      whatsAppSent: 0,
      followUpsScheduled: 0,
      renewalRemindersSent: 0,
      expiryWarningsSent: 0,
      monthlyReportsSent: 0,
      paymentConfirmationsSent: 0,
      details: [],
    };
    const errors = [`Invalid automation timezone: ${config.global.timezone}`];
    await completeAutomationRunLog(runId, {
      status: "FAILED",
      summary,
      errors,
    });
    return {
      runId,
      status: "FAILED",
      summary,
      errors,
      ...(dryRunForced ? { dryRunForced: true } : {}),
    };
  }

  await assertNoActiveAutomationRun();

  const { id: runId } = await createAutomationRunLog({
    trigger: dryRun ? "DRY_RUN" : input.trigger,
    triggeredByEmail: input.triggeredByEmail,
  });

  const summary: AutomationRunSummary = {
    invoicesSent: 0,
    invoicesSkipped: 0,
    paymentRemindersSent: 0,
    whatsAppQueued: 0,
    whatsAppSent: 0,
    followUpsScheduled: 0,
    renewalRemindersSent: 0,
    expiryWarningsSent: 0,
    monthlyReportsSent: 0,
    paymentConfirmationsSent: 0,
    details: [],
  };
  const errors: string[] = [];
  const reference = new Date();

  try {
    const stores = await getAdminPortfolioStoreRows();
    const businesses = groupStoresByBusiness(stores);

    await runInvoiceAutomation(
      config,
      businesses,
      reference,
      dryRun,
      summary,
      errors,
    );
    await runPaymentReminderAutomation(
      config,
      businesses,
      reference,
      dryRun,
      summary,
      errors,
    );
    await runFollowUpScheduling(config, reference, dryRun, summary, errors);
    await runExpiryRenewalReminders(
      config,
      businesses,
      reference,
      dryRun,
      summary,
      errors,
    );
    await runMonthlyReports(
      config,
      businesses,
      reference,
      dryRun,
      summary,
      errors,
    );

    const status =
      errors.length === 0
        ? "SUCCESS"
        : summary.details.some((d) => d.status === "success")
          ? "PARTIAL"
          : "FAILED";

    await completeAutomationRunLog(runId, { status, summary, errors });
    return {
      runId,
      status,
      summary,
      errors,
      ...(dryRunForced ? { dryRunForced: true } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation run failed";
    errors.push(message);
    await completeAutomationRunLog(runId, {
      status: "FAILED",
      summary,
      errors,
    }).catch(() => undefined);
    return {
      runId,
      status: "FAILED",
      summary,
      errors,
      ...(dryRunForced ? { dryRunForced: true } : {}),
    };
  }
}

export async function sendAutomatedPaymentConfirmation(
  businessKey: string,
): Promise<{ sent: boolean; error?: string; skipped?: boolean }> {
  const config = await getAutomationConfig();
  if (!config.invoices.paymentConfirmationEnabled) {
    return { sent: false, skipped: true };
  }
  if (!isSmtpConfigured()) {
    return {
      sent: false,
      error: "Payment confirmation email skipped — SMTP is not configured.",
    };
  }

  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: {
      businessEmail: true,
      businessName: true,
      lastInvoiceNumber: true,
      paidAt: true,
    },
  });
  if (!account?.businessEmail || !account.paidAt) {
    return { sent: false, skipped: true };
  }

  const cycleKey = billingCycleMonthKeyInTimezone(config.global.timezone, account.paidAt);
  const dedupeKey = buildAutomationDedupeKey([
    businessKey,
    "PAYMENT_CONFIRMATION",
    cycleKey,
  ]);
  if (await wasAutomationDelivered(dedupeKey)) {
    return { sent: false, skipped: true };
  }

  try {
    await sendPaymentConfirmationEmail({
      to: account.businessEmail,
      businessName: account.businessName,
      paidAt: account.paidAt,
      invoiceNumber: account.lastInvoiceNumber,
    });

    await recordAutomationDelivery({
      businessKey,
      actionType: "PAYMENT_CONFIRMATION",
      dedupeKey,
      channel: "EMAIL",
      status: "SUCCESS",
      message: "Payment confirmation",
    });

    return { sent: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Payment confirmation email failed";

    await recordAutomationDelivery({
      businessKey,
      actionType: "PAYMENT_CONFIRMATION",
      dedupeKey,
      channel: "EMAIL",
      status: "FAILED",
      message,
    }).catch(() => undefined);

    captureServerError(error, {
      tags: { area: "automation", action: "payment_confirmation" },
      extra: { businessKey, businessEmail: account.businessEmail },
    });

    return {
      sent: false,
      error: `Payment confirmation email failed: ${message}`,
    };
  }
}
