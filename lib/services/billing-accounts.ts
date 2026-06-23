import type {
  BillingFollowUpChannel,
  BillingFollowUpOutcome,
  BillingPaymentStatus,
  Prisma,
} from "@prisma/client";
import { logAuthEvent } from "@/lib/auth/audit";
import { prisma } from "@/lib/db/prisma";
import { syncBusinessDatesForEmail } from "@/lib/services/store-business-dates";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { getAutomationConfig } from "@/lib/services/automation-config";
import { toBillingCycleSettings } from "@/lib/automation/merge-config";
import {
  getBillingCycleStart,
  getBillingDatesForPaidCycle,
} from "@/lib/utils/billing-cycle";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import type { BusinessPortfolioRow } from "@/types";

export class BillingAccountError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BillingAccountError";
  }
}

async function resolveBusiness(businessKey: string): Promise<BusinessPortfolioRow | null> {
  const stores = await getAdminPortfolioStoreRows();
  const businesses = groupStoresByBusiness(stores);
  return businesses.find((business) => business.businessKey === businessKey) ?? null;
}

export interface BillingFollowUpDto {
  id: string;
  channel: BillingFollowUpChannel;
  outcome: BillingFollowUpOutcome;
  notes: string;
  nextFollowUpAt: string | null;
  createdByEmail: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface BillingInvoiceLogDto {
  id: string;
  invoiceNumber: string;
  sentTo: string;
  grandTotal: number;
  sentByEmail: string | null;
  createdAt: string;
}

export interface BillingAccountSummaryDto {
  businessKey: string;
  paymentStatus: BillingPaymentStatus;
  followUpCount: number;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  lastInvoiceSentAt: string | null;
  lastInvoiceNumber: string | null;
}

export interface BillingAccountDetailDto {
  businessKey: string;
  businessName: string;
  businessEmail: string | null;
  paymentStatus: BillingPaymentStatus;
  lastInvoiceNumber: string | null;
  lastInvoiceSentAt: string | null;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
  paidAt: string | null;
  followUpCount: number;
  followUps: BillingFollowUpDto[];
  invoiceLogs: BillingInvoiceLogDto[];
}

function mapFollowUp(
  row: Prisma.BillingFollowUpGetPayload<object>,
): BillingFollowUpDto {
  return {
    id: row.id,
    channel: row.channel,
    outcome: row.outcome,
    notes: row.notes,
    nextFollowUpAt: row.nextFollowUpAt?.toISOString() ?? null,
    createdByEmail: row.createdByEmail,
    createdByName: row.createdByName,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapInvoiceLog(
  row: Prisma.BillingInvoiceLogGetPayload<object>,
): BillingInvoiceLogDto {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    sentTo: row.sentTo,
    grandTotal: row.grandTotal,
    sentByEmail: row.sentByEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function ensureBillingAccount(
  businessKey: string,
): Promise<{ id: string; businessKey: string }> {
  const existing = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: { id: true, businessKey: true },
  });
  if (existing) return existing;

  const business = await resolveBusiness(businessKey);
  if (!business) {
    throw new BillingAccountError("Business not found.", 404);
  }

  const created = await prisma.billingBusinessAccount.create({
    data: {
      businessKey,
      businessName: business.businessName,
      businessEmail: business.businessEmail?.trim().toLowerCase() ?? null,
    },
    select: { id: true, businessKey: true },
  });
  return created;
}

export async function logBillingInvoice(params: {
  businessKey: string;
  invoiceNumber: string;
  sentTo: string;
  grandTotal: number;
  sentByEmail?: string | null;
}): Promise<void> {
  const account = await ensureBillingAccount(params.businessKey);
  const now = new Date();

  await prisma.$transaction([
    prisma.billingBusinessAccount.update({
      where: { id: account.id },
      data: {
        lastInvoiceNumber: params.invoiceNumber,
        lastInvoiceSentAt: now,
      },
    }),
    prisma.billingInvoiceLog.create({
      data: {
        accountId: account.id,
        invoiceNumber: params.invoiceNumber,
        sentTo: params.sentTo,
        grandTotal: params.grandTotal,
        sentByEmail: params.sentByEmail ?? null,
      },
    }),
  ]);
}

export async function createBillingFollowUp(params: {
  businessKey: string;
  channel: BillingFollowUpChannel;
  outcome: BillingFollowUpOutcome;
  notes: string;
  nextFollowUpAt?: Date | null;
  createdByEmail?: string | null;
  createdByName?: string | null;
}): Promise<BillingFollowUpDto> {
  const account = await ensureBillingAccount(params.businessKey);
  const now = new Date();

  const followUp = await prisma.$transaction(async (tx) => {
    const created = await tx.billingFollowUp.create({
      data: {
        accountId: account.id,
        channel: params.channel,
        outcome: params.outcome,
        notes: params.notes,
        nextFollowUpAt: params.nextFollowUpAt ?? null,
        createdByEmail: params.createdByEmail ?? null,
        createdByName: params.createdByName ?? null,
      },
    });

    const accountUpdate: Prisma.BillingBusinessAccountUpdateInput = {
      lastFollowUpAt: now,
      nextFollowUpAt: params.nextFollowUpAt ?? null,
    };

    if (params.outcome === "PAID") {
      accountUpdate.paymentStatus = "PAID";
      accountUpdate.paidAt = now;
      accountUpdate.nextFollowUpAt = null;
    } else if (params.outcome === "PARTIAL_PAYMENT") {
      accountUpdate.paymentStatus = "PARTIAL";
    } else if (params.outcome === "DISPUTED") {
      accountUpdate.paymentStatus = "DISPUTED";
    }

    await tx.billingBusinessAccount.update({
      where: { id: account.id },
      data: accountUpdate,
    });

    return created;
  });

  if (
    params.outcome === "PAID" ||
    params.outcome === "PARTIAL_PAYMENT" ||
    params.outcome === "DISPUTED"
  ) {
    const status: BillingPaymentStatus =
      params.outcome === "PAID"
        ? "PAID"
        : params.outcome === "PARTIAL_PAYMENT"
          ? "PARTIAL"
          : "DISPUTED";
    await syncStoreDatesForBusinessKey(params.businessKey, status);
  }

  void logAuthEvent({
    event: "BILLING_FOLLOW_UP_CREATED",
    email: params.createdByEmail ?? null,
    metadata: {
      businessKey: params.businessKey,
      channel: params.channel,
      outcome: params.outcome,
      nextFollowUpAt: params.nextFollowUpAt?.toISOString() ?? null,
    },
  });

  return mapFollowUp(followUp);
}

async function syncStoreDatesForBusinessKey(
  businessKey: string,
  paymentStatus: BillingPaymentStatus,
): Promise<void> {
  const business = await resolveBusiness(businessKey);
  if (!business?.businessEmail) return;

  const config = await getAutomationConfig().catch(() => null);
  const cycleSettings = config
    ? toBillingCycleSettings(config)
    : await getBillingCycleSettings();

  if (paymentStatus === "PAID" || paymentStatus === "WAIVED") {
    if (config && !config.expiryRenewal.autoExtendOnPayment) {
      return;
    }
    const { renewalDueAt, dataExpiryAt } = getBillingDatesForPaidCycle(
      new Date(),
      cycleSettings,
    );
    await syncBusinessDatesForEmail(business.businessEmail, {
      renewalDueAt,
      dataExpiryAt,
    });
    return;
  }

  const cycleStart = getBillingCycleStart(new Date(), cycleSettings);
  const renewalDueAt = new Date(
    cycleStart.getFullYear(),
    cycleStart.getMonth(),
    cycleSettings.paymentDueDay,
  );
  const dataExpiryAt = new Date(
    cycleStart.getFullYear(),
    cycleStart.getMonth() + 1,
    cycleSettings.cycleStartDay,
  );
  await syncBusinessDatesForEmail(business.businessEmail, {
    renewalDueAt,
    dataExpiryAt,
  });
}

export async function updateBillingPaymentStatus(params: {
  businessKey: string;
  paymentStatus: BillingPaymentStatus;
  notes?: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
}): Promise<BillingAccountDetailDto> {
  const account = await ensureBillingAccount(params.businessKey);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.billingBusinessAccount.update({
      where: { id: account.id },
      data: {
        paymentStatus: params.paymentStatus,
        paidAt: params.paymentStatus === "PAID" ? now : null,
        nextFollowUpAt:
          params.paymentStatus === "PAID" ? null : undefined,
      },
    });

    if (params.notes?.trim()) {
      const outcome: BillingFollowUpOutcome =
        params.paymentStatus === "PAID"
          ? "PAID"
          : params.paymentStatus === "PARTIAL"
            ? "PARTIAL_PAYMENT"
            : params.paymentStatus === "DISPUTED"
              ? "DISPUTED"
              : "OTHER";

      await tx.billingFollowUp.create({
        data: {
          accountId: account.id,
          channel: "OTHER",
          outcome,
          notes: params.notes.trim(),
          createdByEmail: params.createdByEmail ?? null,
          createdByName: params.createdByName ?? null,
        },
      });

      await tx.billingBusinessAccount.update({
        where: { id: account.id },
        data: { lastFollowUpAt: now },
      });
    }
  });

  await syncStoreDatesForBusinessKey(params.businessKey, params.paymentStatus);

  if (params.paymentStatus === "PAID") {
    const { sendAutomatedPaymentConfirmation } = await import(
      "@/lib/services/run-billing-automation"
    );
    void sendAutomatedPaymentConfirmation(params.businessKey).catch((error) => {
      console.error("[billing] payment confirmation email failed", error);
    });
  }

  void logAuthEvent({
    event: "BILLING_PAYMENT_STATUS_CHANGED",
    email: params.createdByEmail ?? null,
    metadata: {
      businessKey: params.businessKey,
      paymentStatus: params.paymentStatus,
      notes: params.notes?.trim() || null,
    },
  });

  return getBillingAccountDetail(params.businessKey);
}

export async function getBillingAccountDetail(
  businessKey: string,
): Promise<BillingAccountDetailDto> {
  const business = await resolveBusiness(businessKey);
  if (!business) {
    throw new BillingAccountError("Business not found.", 404);
  }

  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    include: {
      followUps: { orderBy: { createdAt: "desc" } },
      invoiceLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!account) {
    return {
      businessKey,
      businessName: business.businessName,
      businessEmail: business.businessEmail,
      paymentStatus: "UNPAID",
      lastInvoiceNumber: null,
      lastInvoiceSentAt: null,
      lastFollowUpAt: null,
      nextFollowUpAt: null,
      paidAt: null,
      followUpCount: 0,
      followUps: [],
      invoiceLogs: [],
    };
  }

  return {
    businessKey: account.businessKey,
    businessName: account.businessName,
    businessEmail: account.businessEmail,
    paymentStatus: account.paymentStatus,
    lastInvoiceNumber: account.lastInvoiceNumber,
    lastInvoiceSentAt: account.lastInvoiceSentAt?.toISOString() ?? null,
    lastFollowUpAt: account.lastFollowUpAt?.toISOString() ?? null,
    nextFollowUpAt: account.nextFollowUpAt?.toISOString() ?? null,
    paidAt: account.paidAt?.toISOString() ?? null,
    followUpCount: account.followUps.length,
    followUps: account.followUps.map(mapFollowUp),
    invoiceLogs: account.invoiceLogs.map(mapInvoiceLog),
  };
}

export async function getBillingSummaries(): Promise<BillingAccountSummaryDto[]> {
  const accounts = await prisma.billingBusinessAccount.findMany({
    include: {
      _count: { select: { followUps: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return accounts.map((account) => ({
    businessKey: account.businessKey,
    paymentStatus: account.paymentStatus,
    followUpCount: account._count.followUps,
    lastFollowUpAt: account.lastFollowUpAt?.toISOString() ?? null,
    nextFollowUpAt: account.nextFollowUpAt?.toISOString() ?? null,
    lastInvoiceSentAt: account.lastInvoiceSentAt?.toISOString() ?? null,
    lastInvoiceNumber: account.lastInvoiceNumber,
  }));
}
