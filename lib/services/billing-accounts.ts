import type {
  BillingFollowUpChannel,
  BillingFollowUpOutcome,
  BillingPaymentStatus,
  Prisma,
} from "@prisma/client";
import { logAuthEvent } from "@/lib/auth/audit";
import { prisma } from "@/lib/db/prisma";
import { syncBusinessDatesForEmail } from "@/lib/services/store-business-dates";
import { getAutomationConfig } from "@/lib/services/automation-config";
import { syncBillingAnchorForBusinessKey } from "@/lib/services/billing-anchor";
import { getActivationBillingPeriod, resolveBusinessBillingAnchor } from "@/lib/billing/activation-cycle";
import {
  calculateOutstandingBilling,
  outstandingPeriodBreakdownJson,
} from "@/lib/billing/outstanding-billing";
import { settlementFromAccount, type BillingPeriodSettlement } from "@/lib/billing/period-settlement";
import { getActiveBillingPricingConfig } from "@/lib/platform/billing-pricing";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import { getAdminPortfolioStoreRows } from "@/lib/services/stores";
import { formatInvoiceNumber, invoiceNumberPrefix, randomInvoiceSuffix } from "@/lib/emails/render-invoice-email";
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

async function resolvePaidThroughForBusinessKey(
  businessKey: string,
  reference = new Date(),
  options?: {
    settlementOverride?: BillingPeriodSettlement;
  },
): Promise<Date | null> {
  const business = await resolveBusiness(businessKey);
  if (!business) return null;

  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: { billingAnchorAt: true, paidAt: true, paidThroughPeriodEnd: true },
  });

  const billingAnchorAt =
    account?.billingAnchorAt ??
    resolveBusinessBillingAnchor(
      business.stores.map((store) => ({ createdAt: store.createdAt })),
    );
  if (!billingAnchorAt) return null;

  const pricingConfig = await getActiveBillingPricingConfig();
  const settlement =
    options?.settlementOverride ??
    settlementFromAccount({
      paidAt: account?.paidAt ?? null,
      paidThroughPeriodEnd: account?.paidThroughPeriodEnd ?? null,
    });
  const outstanding = calculateOutstandingBilling(business.stores, pricingConfig, {
    billingAnchorAt,
    settlement,
    reference,
  });

  const lastPeriod = outstanding.periods.at(-1);
  if (lastPeriod) {
    return new Date(lastPeriod.periodEnd);
  }

  return getActivationBillingPeriod(billingAnchorAt, reference).periodEnd;
}

export async function buildOutstandingBillingForBusinessKey(
  businessKey: string,
  reference = new Date(),
) {
  const business = await resolveBusiness(businessKey);
  if (!business) return null;

  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: {
      paidAt: true,
      paidThroughPeriodEnd: true,
      billingAnchorAt: true,
    },
  });

  const billingAnchorAt =
    account?.billingAnchorAt ??
    resolveBusinessBillingAnchor(
      business.stores.map((store) => ({ createdAt: store.createdAt })),
    );
  if (!billingAnchorAt) return null;

  const pricingConfig = await getActiveBillingPricingConfig();
  return calculateOutstandingBilling(business.stores, pricingConfig, {
    billingAnchorAt,
    settlement: settlementFromAccount({
      paidAt: account?.paidAt ?? null,
      paidThroughPeriodEnd: account?.paidThroughPeriodEnd ?? null,
    }),
    reference,
  });
}

export { outstandingPeriodBreakdownJson };

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
  periodStart: string | null;
  periodEnd: string | null;
  unpaidPeriodCount: number | null;
  periodBreakdown: unknown | null;
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
  paidThroughPeriodEnd: string | null;
  billingAnchorAt: string | null;
  followUpCount: number;
  followUps: BillingFollowUpDto[];
  invoiceLogs: BillingInvoiceLogDto[];
  warnings?: string[];
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
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    unpaidPeriodCount: row.unpaidPeriodCount ?? null,
    periodBreakdown: row.periodBreakdown ?? null,
  };
}

export async function ensureBillingAccount(
  businessKey: string,
): Promise<{ id: string; businessKey: string }> {
  const existing = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: { id: true, businessKey: true },
  });
  if (existing) {
    await syncBillingAnchorForBusinessKey(businessKey);
    return existing;
  }

  const business = await resolveBusiness(businessKey);
  if (!business) {
    throw new BillingAccountError("Business not found.", 404);
  }

  const billingAnchorAt = resolveBusinessBillingAnchor(
    business.stores.map((store) => ({ createdAt: store.createdAt })),
  );

  const created = await prisma.billingBusinessAccount.create({
    data: {
      businessKey,
      businessName: business.businessName,
      businessEmail: business.businessEmail?.trim().toLowerCase() ?? null,
      billingAnchorAt,
    },
    select: { id: true, businessKey: true },
  });
  return created;
}

export async function allocateInvoiceNumber(reference = new Date()): Promise<string> {
  const prefix = invoiceNumberPrefix(reference);
  const rows = await prisma.billingInvoiceLog.findMany({
    where: { invoiceNumber: { startsWith: prefix } },
    select: { invoiceNumber: true },
  });

  const taken = new Set(rows.map((row) => row.invoiceNumber));
  let maxSuffix = 0;
  for (const row of rows) {
    const suffix = row.invoiceNumber.slice(prefix.length);
    if (/^\d+$/.test(suffix)) {
      maxSuffix = Math.max(maxSuffix, Number.parseInt(suffix, 10));
    }
  }

  if (maxSuffix === 0) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const candidate = formatInvoiceNumber(reference, randomInvoiceSuffix());
      if (!taken.has(candidate)) return candidate;
    }
  }

  let next = maxSuffix + 1;
  while (next <= 999_999) {
    const candidate = formatInvoiceNumber(reference, next);
    if (!taken.has(candidate)) return candidate;
    next += 1;
  }

  throw new BillingAccountError("Invoice number pool exhausted for today.", 500);
}

export async function logBillingInvoice(params: {
  businessKey: string;
  invoiceNumber: string;
  sentTo: string;
  grandTotal: number;
  sentByEmail?: string | null;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  unpaidPeriodCount?: number;
  periodBreakdown?: Prisma.InputJsonValue;
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
        periodStart: params.periodStart ?? null,
        periodEnd: params.periodEnd ?? null,
        unpaidPeriodCount: params.unpaidPeriodCount ?? null,
        periodBreakdown: params.periodBreakdown ?? undefined,
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
      accountUpdate.paidThroughPeriodEnd = await resolvePaidThroughForBusinessKey(
        params.businessKey,
        now,
      );
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
  options?: { force?: boolean },
): Promise<void> {
  const business = await resolveBusiness(businessKey);
  if (!business?.businessEmail) return;

  const billingAnchorAt = resolveBusinessBillingAnchor(
    business.stores.map((store) => ({ createdAt: store.createdAt })),
  );
  if (!billingAnchorAt) return;

  const reference = new Date();
  const period = getActivationBillingPeriod(billingAnchorAt, reference);

  if (paymentStatus === "PAID" || paymentStatus === "WAIVED") {
    const config = await getAutomationConfig().catch(() => null);
    if (config && !config.expiryRenewal.autoExtendOnPayment && !options?.force) {
      return;
    }
    const nextPeriod = getActivationBillingPeriod(
      billingAnchorAt,
      new Date(period.periodEnd.getTime() + 86_400_000),
    );
    await syncBusinessDatesForEmail(business.businessEmail, {
      renewalDueAt: nextPeriod.dueDate,
      dataExpiryAt: nextPeriod.periodEnd,
    });
    return;
  }

  await syncBusinessDatesForEmail(business.businessEmail, {
    renewalDueAt: period.dueDate,
    dataExpiryAt: period.periodEnd,
  });
}

export async function updateBillingPaymentStatus(params: {
  businessKey: string;
  paymentStatus: BillingPaymentStatus;
  notes?: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
  /** Admin-confirmed payments bypass autoExtendOnPayment and extend access immediately. */
  forceImmediateActivation?: boolean;
}): Promise<BillingAccountDetailDto> {
  const account = await ensureBillingAccount(params.businessKey);
  const accountRecord = await prisma.billingBusinessAccount.findUnique({
    where: { id: account.id },
    select: { id: true, paidThroughPeriodEnd: true },
  });
  if (!accountRecord) {
    throw new BillingAccountError("Billing account not found.", 404);
  }

  const now = new Date();
  const paidThroughPeriodEnd =
    params.paymentStatus === "PAID"
      ? await resolvePaidThroughForBusinessKey(params.businessKey, now, {
          settlementOverride: {
            paidAt: now,
            paidThroughPeriodEnd: accountRecord.paidThroughPeriodEnd,
          },
        })
      : null;

  await prisma.$transaction(async (tx) => {
    await applyBillingPaymentStatusInTransaction(tx, {
      accountId: accountRecord.id,
      paymentStatus: params.paymentStatus,
      notes: params.notes,
      createdByEmail: params.createdByEmail,
      createdByName: params.createdByName,
      now,
      paidThroughPeriodEnd,
    });
  });

  const warnings = await finalizeBillingPaymentStatusSideEffects({
    businessKey: params.businessKey,
    paymentStatus: params.paymentStatus,
    notes: params.notes,
    createdByEmail: params.createdByEmail,
    forceImmediateActivation: params.forceImmediateActivation,
  });

  const detail = await getBillingAccountDetail(params.businessKey);
  return warnings.length > 0 ? { ...detail, warnings } : detail;
}

type BillingPaymentStatusTxParams = {
  accountId: string;
  paymentStatus: BillingPaymentStatus;
  notes?: string;
  createdByEmail?: string | null;
  createdByName?: string | null;
  now: Date;
  paidThroughPeriodEnd: Date | null;
};

export async function applyBillingPaymentStatusInTransaction(
  tx: Prisma.TransactionClient,
  params: BillingPaymentStatusTxParams,
): Promise<void> {
  await tx.billingBusinessAccount.update({
    where: { id: params.accountId },
    data: {
      paymentStatus: params.paymentStatus,
      paidAt: params.paymentStatus === "PAID" ? params.now : null,
      paidThroughPeriodEnd:
        params.paymentStatus === "PAID" ? params.paidThroughPeriodEnd : null,
      nextFollowUpAt: params.paymentStatus === "PAID" ? null : undefined,
    },
  });

  if (!params.notes?.trim()) return;

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
      accountId: params.accountId,
      channel: "OTHER",
      outcome,
      notes: params.notes.trim(),
      createdByEmail: params.createdByEmail ?? null,
      createdByName: params.createdByName ?? null,
    },
  });

  await tx.billingBusinessAccount.update({
    where: { id: params.accountId },
    data: { lastFollowUpAt: params.now },
  });
}

export async function finalizeBillingPaymentStatusSideEffects(params: {
  businessKey: string;
  paymentStatus: BillingPaymentStatus;
  notes?: string;
  createdByEmail?: string | null;
  forceImmediateActivation?: boolean;
}): Promise<string[]> {
  const warnings: string[] = [];

  await syncStoreDatesForBusinessKey(params.businessKey, params.paymentStatus, {
    force: params.forceImmediateActivation,
  });

  if (params.paymentStatus === "PAID") {
    const { sendAutomatedPaymentConfirmation } = await import(
      "@/lib/services/run-billing-automation"
    );
    const confirmation = await sendAutomatedPaymentConfirmation(params.businessKey);
    if (confirmation.error) {
      warnings.push(confirmation.error);
    }
  }

  void logAuthEvent({
    event: "BILLING_PAYMENT_STATUS_CHANGED",
    email: params.createdByEmail ?? null,
    metadata: {
      businessKey: params.businessKey,
      paymentStatus: params.paymentStatus,
      notes: params.notes?.trim() || null,
      ...(warnings.length > 0 ? { paymentConfirmationWarning: warnings[0] } : {}),
    },
  });

  return warnings;
}

export async function resolvePaidThroughForPaidActivation(
  businessKey: string,
  accountPaidThroughPeriodEnd: Date | null,
  reference = new Date(),
): Promise<Date | null> {
  return resolvePaidThroughForBusinessKey(businessKey, reference, {
    settlementOverride: {
      paidAt: reference,
      paidThroughPeriodEnd: accountPaidThroughPeriodEnd,
    },
  });
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
      paidThroughPeriodEnd: null,
      billingAnchorAt: null,
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
    paidThroughPeriodEnd: account.paidThroughPeriodEnd?.toISOString() ?? null,
    billingAnchorAt: account.billingAnchorAt?.toISOString() ?? null,
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
