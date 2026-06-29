import { prisma } from "@/lib/db/prisma";
import {
  createAutomationRunLog,
  completeAutomationRunLog,
  getAutomationConfig,
  getAutomationRunById,
} from "@/lib/services/automation-config";
import { sendBusinessInvoice } from "@/lib/services/send-business-invoice";
import { createBillingFollowUp, getBillingSummaries } from "@/lib/services/billing-accounts";
import { toBillingCycleSettings } from "@/lib/automation/merge-config";
import { computeAdminPortfolioKpis } from "@/lib/utils/admin-portfolio-kpis";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  buildAutomationDedupeKey,
  claimAutomationDelivery,
  countAutomationDeliveries,
  type AutomationDeliveryAction,
  recordAutomationDelivery,
  releaseAutomationDeliveryClaim,
  wasAutomationDelivered,
} from "@/lib/automation/delivery-log";
import { shouldSendInvoiceToday } from "@/lib/automation/invoice-schedule";
import {
  billingCycleMonthKeyInTimezone,
  isWithinBusinessHoursInTimezone,
  shouldRunAtHourInTimezone,
  shouldRunOnDayInTimezone,
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
import { groupStoresByBusiness, resolveBusinessPhone } from "@/lib/utils/group-stores-by-business";
import {
  formatNormalizedWhatsAppPhone,
  resolveWhatsAppPhoneForBusiness,
} from "@/lib/automation/whatsapp-phone";
import { getPlatformBranding } from "@/lib/platform/branding";
import { getActiveBillingPricingConfig } from "@/lib/platform/billing-pricing";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import { buildBillingWhatsAppReminderMessage } from "@/lib/services/send-billing-whatsapp-reminder";
import { queueAutomationWhatsAppReminder } from "@/lib/automation/whatsapp-reminder-delivery";
import type {
  AutomationRunDetail,
  AutomationRunLogDto,
  AutomationRunSummary,
  PlatformAutomationConfig,
} from "@/lib/automation/types";
import { assertManualAutomationRunAllowed } from "@/lib/automation/run-request";
import type { AutomationRunStatus, AutomationRunTrigger } from "@prisma/client";
import type { BusinessPortfolioRow } from "@/types";

export function resolveAutomationRunStatus(
  summary: AutomationRunSummary,
  errors: string[],
): AutomationRunStatus {
  if (errors.length === 0) return "SUCCESS";

  const hasSuccessfulActions =
    summary.invoicesSent > 0 ||
    summary.paymentRemindersSent > 0 ||
    summary.whatsAppQueued > 0 ||
    summary.followUpsScheduled > 0 ||
    summary.renewalRemindersSent > 0 ||
    summary.expiryWarningsSent > 0 ||
    summary.monthlyReportsSent > 0 ||
    summary.paymentConfirmationsSent > 0 ||
    summary.details.some((detail) => detail.status === "success");

  return hasSuccessfulActions ? "PARTIAL" : "FAILED";
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
  claim: {
    businessKey?: string | null;
    actionType: AutomationDeliveryAction;
    channel?: string | null;
    message?: string | null;
  };
}): Promise<boolean> {
  if (input.dryRun) return false;

  const claimed = await claimAutomationDelivery({
    dedupeKey: input.dedupeKey,
    businessKey: input.claim.businessKey,
    actionType: input.claim.actionType,
    channel: input.claim.channel,
    message: input.claim.message,
  });
  if (!claimed) {
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

  const billingAccounts = businesses.length
    ? await prisma.billingBusinessAccount.findMany({
        where: { businessKey: { in: businesses.map((business) => business.businessKey) } },
        select: {
          businessKey: true,
          paymentStatus: true,
          paidAt: true,
          paidThroughPeriodEnd: true,
        },
      })
    : [];
  const accountByKey = new Map(billingAccounts.map((account) => [account.businessKey, account]));

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

    const account = accountByKey.get(business.businessKey);
    const status = getBusinessPaymentStatus(
      business,
      reference,
      account?.paymentStatus ?? null,
      account?.paidAt ?? null,
      cycleSettings,
      undefined,
      account?.paidThroughPeriodEnd ?? null,
    );
    if (config.invoices.skipIfPaid && status === "CURRENT") {
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
        claim: {
          businessKey: business.businessKey,
          actionType: "INVOICE",
          channel: "EMAIL",
          message: schedule.reason,
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
      await releaseAutomationDeliveryClaim(dedupeKey);
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
      billingSummary?.paidAt ?? null,
      cycleSettings,
      undefined,
      billingSummary?.paidThroughPeriodEnd ?? null,
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
          claim: {
            businessKey: business.businessKey,
            actionType: "PAYMENT_REMINDER",
            channel: "EMAIL",
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
          await releaseAutomationDeliveryClaim(dedupeKey);
          const message =
            error instanceof Error ? error.message : "Reminder email failed";
          errors.push(`${business.businessName}: ${message}`);
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
          claim: {
            businessKey: business.businessKey,
            actionType: "WHATSAPP_REMINDER",
            channel: "WHATSAPP",
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
      const resolvedPhone = resolveWhatsAppPhoneForBusiness(
        business,
        config.whatsApp.defaultCountryCode,
      );
      if (!resolvedPhone) {
        if (!dryRun) {
          await releaseAutomationDeliveryClaim(dedupeKey);
        }
        addDetail(summary, {
          action: "whatsapp_reminder",
          businessKey: business.businessKey,
          businessName: business.businessName,
          channel: "WHATSAPP",
          status: "skipped",
          message: resolveBusinessPhone(business.stores)
            ? "Phone number is not valid for WhatsApp with the configured country code"
            : "No phone number on file for WhatsApp",
        });
        continue;
      }
      const formattedPhone = formatNormalizedWhatsAppPhone(resolvedPhone.normalized);
      const nextFollowUpAt = new Date(reference);
      nextFollowUpAt.setDate(nextFollowUpAt.getDate() + 1);

      try {
        const queued = await queueAutomationWhatsAppReminder({
          businessKey: business.businessKey,
          businessName: business.businessName,
          formattedPhone,
          message,
          nextFollowUpAt,
          dedupeKey,
          dryRun,
        });
        summary.whatsAppQueued += queued.whatsAppQueued;
        addDetail(summary, queued.detail);
      } catch (error) {
        const messageText =
          error instanceof Error ? error.message : "WhatsApp queue failed";
        errors.push(`${business.businessName}: ${messageText}`);
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
            claim: {
              businessKey: business.businessKey,
              actionType: "RENEWAL_REMINDER",
              channel: "EMAIL",
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
            await releaseAutomationDeliveryClaim(dedupeKey);
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
            claim: {
              businessKey: business.businessKey,
              actionType: "EXPIRY_WARNING",
              channel: "EMAIL",
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
            await releaseAutomationDeliveryClaim(dedupeKey);
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
  if (!shouldRunAtHourInTimezone(config.monthlyReports.sendHourLocal, timezone, reference)) {
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

  const bodyText = reportLines.join("\n");
  const subject = `${branding.platformName} monthly report — ${reference.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;

  const recipients = new Set<string>();
  if (
    config.monthlyReports.recipients === "admin_only" ||
    config.monthlyReports.recipients === "both"
  ) {
    const adminEmail = process.env.MASTER_ADMIN_EMAIL?.trim();
    if (adminEmail) recipients.add(adminEmail);
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
        claim: {
          actionType: "MONTHLY_REPORT",
          channel: "EMAIL",
          message: to,
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
      await sendMonthlyReportEmail({ to, subject, bodyText });
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
      await releaseAutomationDeliveryClaim(dedupeKey);
      errors.push(
        `${to}: ${error instanceof Error ? error.message : "Monthly report failed"}`,
      );
    }
  }
}

async function loadCompletedRun(runId: string): Promise<AutomationRunLogDto> {
  const run = await getAutomationRunById(runId);
  if (!run) {
    throw new Error(`Automation run log ${runId} not found after completion`);
  }
  return run;
}

export async function runBillingAutomation(input: {
  trigger: AutomationRunTrigger;
  dryRun?: boolean;
  triggeredByEmail?: string | null;
}): Promise<AutomationRunLogDto> {
  const config = await getAutomationConfig({ fresh: true });
  const dryRun = input.dryRun === true || config.global.dryRunMode;

  assertManualAutomationRunAllowed(config, input);

  if (!config.global.enabled && !dryRun && input.trigger !== "MANUAL") {
    const summary: AutomationRunSummary = {
      invoicesSent: 0,
      invoicesSkipped: 0,
      paymentRemindersSent: 0,
      whatsAppQueued: 0,
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
    const status: AutomationRunStatus = "SUCCESS";
    await completeAutomationRunLog(runId, {
      status,
      summary,
    });
    return loadCompletedRun(runId);
  }

  const { id: runId } = await createAutomationRunLog({
    trigger: dryRun ? "DRY_RUN" : input.trigger,
    triggeredByEmail: input.triggeredByEmail,
  });

  const summary: AutomationRunSummary = {
    invoicesSent: 0,
    invoicesSkipped: 0,
    paymentRemindersSent: 0,
    whatsAppQueued: 0,
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

    const status = resolveAutomationRunStatus(summary, errors);

    await completeAutomationRunLog(runId, { status, summary, errors });
    return loadCompletedRun(runId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Automation run failed";
    errors.push(message);
    const status: AutomationRunStatus = "FAILED";
    await completeAutomationRunLog(runId, {
      status,
      summary,
      errors,
    });
    return loadCompletedRun(runId);
  }
}

export async function sendAutomatedPaymentConfirmation(
  businessKey: string,
): Promise<void> {
  const config = await getAutomationConfig();
  if (!config.invoices.paymentConfirmationEnabled) return;
  if (!isSmtpConfigured()) return;

  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: {
      businessEmail: true,
      businessName: true,
      lastInvoiceNumber: true,
      paidAt: true,
    },
  });
  if (!account?.businessEmail || !account.paidAt) return;

  const cycleKey = billingCycleMonthKeyInTimezone(config.global.timezone, account.paidAt);
  const dedupeKey = buildAutomationDedupeKey([
    businessKey,
    "PAYMENT_CONFIRMATION",
    cycleKey,
  ]);
  if (await wasAutomationDelivered(dedupeKey)) return;

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
}
