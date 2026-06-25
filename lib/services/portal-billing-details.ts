import type { AppSession } from "@/types";
import type { BusinessPortfolioRow } from "@/types";
import { getAppBaseUrl } from "@/lib/auth/get-app-url";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { getActivationBillingPeriod } from "@/lib/billing/activation-cycle";
import {
  calculateOutstandingBilling,
  consolidateOutstandingBilling,
  type BusinessOutstandingBilling,
} from "@/lib/billing/outstanding-billing";
import { applyDevBillingPendingMock } from "@/lib/billing/dev-billing-pending-mock";
import { settlementFromAccount } from "@/lib/billing/period-settlement";
import { resolveBillingAnchorForBusinessKey } from "@/lib/services/billing-anchor";
import {
  generateProvisionalInvoiceRef,
  renderInvoiceEmailHtml,
  type InvoiceEmailContent,
} from "@/lib/emails/render-invoice-email";
import { prisma } from "@/lib/db/prisma";
import { mergeStoreWhere } from "@/lib/db/store-scope";
import { getActiveBillingPricingConfig } from "@/lib/platform/billing-pricing";
import {
  brandingFromSettings,
  getPlatformBranding,
  type PlatformBranding,
} from "@/lib/platform/branding";
import {
  listAccessibleStores,
  type StorePortalSession,
} from "@/lib/services/manager-stores";
import {
  BillingAccountError,
  getBillingAccountDetail,
  type BillingAccountDetailDto,
  type BillingInvoiceLogDto,
} from "@/lib/services/billing-accounts";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { getBusinessPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import {
  getBillingPaymentStatusLabel,
} from "@/lib/utils/billing-status-labels";
import { groupStoresByBusiness } from "@/lib/utils/group-stores-by-business";
import {
  buildUpiPaymentUri,
  PORTAL_PAY_NOW_TIMER_SECONDS,
  resolvePaymentUpiVpa,
} from "@/lib/utils/upi-payment";
import { formatDate } from "@/lib/utils/formatters";
import {
  calculateBusinessMonthlyBilling,
  buildPortalPricingTiers,
  formatPricingTiersSummary,
  type PortalPricingTierRow,
  type BusinessMonthlyBilling,
} from "@/lib/utils/store-billing-pricing";
import {
  applyPortalBillingAccessForRole,
  isBillingPaidForCurrentCycle,
  resolvePortalBillingAccess,
  type PortalBillingAccessReason,
  type PortalBillingRestrictionTier,
} from "@/lib/utils/portal-billing-access";
import type { AdminStorePortfolioRow } from "@/types";
import type { AdminPortfolioPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import type { BillingPaymentStatus } from "@prisma/client";

export class PortalBillingDetailsError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PortalBillingDetailsError";
  }
}

async function getPortfolioRowsForStoreIds(
  storeIds: string[],
): Promise<AdminStorePortfolioRow[]> {
  if (storeIds.length === 0) return [];

  const stores = await prisma.store.findMany({
    where: mergeStoreWhere({ id: { in: storeIds }, isActive: true }),
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      customCategory: true,
      city: true,
      state: true,
      pincode: true,
      businessOwnerName: true,
      businessOwnerEmail: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      purgeAt: true,
      dataExpiryAt: true,
      renewalDueAt: true,
      staff: {
        where: { isActive: true },
        select: { name: true, phone: true, role: true },
      },
      _count: { select: { staff: { where: { isActive: true } } } },
    },
  });

  return stores.map((store) => {
    const manager = store.staff.find((member) => member.role === "STORE_MANAGER");
    const staffWithPhone = store.staff.find((member) => member.phone?.trim());
    const contactPhone =
      manager?.phone?.trim() || staffWithPhone?.phone?.trim() || null;

    return {
      storeId: store.id,
      storeName: store.name,
      category: store.category,
      customCategory: store.customCategory,
      city: store.city,
      state: store.state,
      pincode: store.pincode,
      isActive: store.isActive,
      businessOwnerName: store.businessOwnerName,
      businessOwnerEmail: store.businessOwnerEmail,
      storeManagerName: manager?.name ?? staffWithPhone?.name ?? null,
      storeManagerPhone: contactPhone,
      staffCount: store._count.staff,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
      deletedAt: store.deletedAt?.toISOString() ?? null,
      purgeAt: store.purgeAt?.toISOString() ?? null,
      dataExpiryAt: store.dataExpiryAt?.toISOString() ?? null,
      renewalDueAt: store.renewalDueAt?.toISOString() ?? null,
      ownerLastLoginAt: null,
    };
  });
}

export async function resolvePortalBusinessPortfolio(
  session: StorePortalSession,
): Promise<BusinessPortfolioRow | null> {
  const accessible = await listAccessibleStores(session);
  const storeIds = accessible.map((store) => store.id);
  if (storeIds.length === 0) return null;

  const rows = await getPortfolioRowsForStoreIds(storeIds);
  const businesses = groupStoresByBusiness(rows);
  if (businesses.length === 0) return null;

  return (
    businesses.find((business) =>
      business.stores.some((store) => store.storeId === session.storeId),
    ) ?? businesses[0]!
  );
}

export interface PortalBillingAccessSnapshot {
  canReadData: boolean;
  isGracePeriod: boolean;
  billingRestricted: boolean;
  metricsBlurred: boolean;
  reason: PortalBillingAccessReason;
  paymentDeadline: string;
  paymentDeadlineFallback: string;
  isPaidForCurrentCycle: boolean;
  billingAnchorAt: string | null;
  consecutiveUnpaidPeriods: number;
  restrictionTier: PortalBillingRestrictionTier;
}

export type PortalPayNowAction = "upi";

export type PortalPayNowUnavailableReason =
  | "ALREADY_PAID"
  | "WAIVED"
  | "NO_CHARGE"
  | "NO_STORES"
  | "NO_UPI";

export interface PortalPayNowDto {
  available: boolean;
  amountInr: number;
  action: PortalPayNowAction | null;
  href: string | null;
  upiVpa: string | null;
  upiPayeeName: string | null;
  invoiceRef: string | null;
  timerSeconds: number;
  unavailableReason: PortalPayNowUnavailableReason | null;
}

export interface PortalBillingDetailsDto {
  businessKey: string;
  businessName: string;
  businessEmail: string | null;
  ownerName: string | null;
  paymentStatus: BillingPaymentStatus;
  portfolioPaymentStatus: AdminPortfolioPaymentStatus;
  portfolioPaymentStatusLabel: string;
  renewalDueAt: string | null;
  dataExpiryAt: string | null;
  invoiceDate: string;
  paidAt: string | null;
  lastInvoiceNumber: string | null;
  lastInvoiceSentAt: string | null;
  invoiceLogs: BillingInvoiceLogDto[];
  monthlyBilling: BusinessMonthlyBilling;
  outstandingBilling: BusinessOutstandingBilling;
  pricingTiersSummary: string;
  pricingTiers: PortalPricingTierRow[];
  gstRatePercent: number;
  storeCount: number;
  totalStaff: number;
  access: PortalBillingAccessSnapshot;
  payNow: PortalPayNowDto;
}

export interface PortalInvoicePreviewDto {
  invoiceNumber: string;
  html: string;
  isHistorical: boolean;
  historicalGrandTotal: number | null;
  currentGrandTotal: number;
}

function emptyBillingAccount(business: BusinessPortfolioRow): BillingAccountDetailDto {
  return {
    businessKey: business.businessKey,
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

async function getPortalBillingAccount(
  business: BusinessPortfolioRow,
): Promise<BillingAccountDetailDto> {
  try {
    return await getBillingAccountDetail(business.businessKey);
  } catch (error) {
    if (error instanceof BillingAccountError) {
      return emptyBillingAccount(business);
    }
    throw error;
  }
}

function buildPortalAccessSnapshot(params: {
  account: Pick<
    BillingAccountDetailDto,
    "paymentStatus" | "paidAt" | "paidThroughPeriodEnd"
  >;
  billingAnchorAt: Date | null;
  restrictPortalOnOverdue: boolean;
  role: AppSession["role"];
  reference: Date;
}): PortalBillingAccessSnapshot {
  const base = resolvePortalBillingAccess(
    {
      paymentStatus: params.account.paymentStatus,
      paidAt: params.account.paidAt,
      paidThroughPeriodEnd: params.account.paidThroughPeriodEnd,
      billingAnchorAt: params.billingAnchorAt,
      restrictPortalOnOverdue: params.restrictPortalOnOverdue,
    },
    params.reference,
  );
  const roleAccess = applyPortalBillingAccessForRole(base, params.role);

  return {
    canReadData: roleAccess.canReadData,
    isGracePeriod: roleAccess.isGracePeriod,
    billingRestricted: roleAccess.billingRestricted,
    metricsBlurred: roleAccess.metricsBlurred,
    reason: roleAccess.reason,
    paymentDeadline: roleAccess.paymentDeadline.toISOString(),
    paymentDeadlineFallback: formatDate(roleAccess.paymentDeadline),
    isPaidForCurrentCycle: isBillingPaidForCurrentCycle(
      params.account.paidAt,
      params.billingAnchorAt,
      params.reference,
      params.account.paidThroughPeriodEnd,
    ),
    billingAnchorAt: params.billingAnchorAt?.toISOString() ?? null,
    consecutiveUnpaidPeriods: roleAccess.consecutiveUnpaidPeriods,
    restrictionTier: roleAccess.restrictionTier,
  };
}


function resolvePortalInvoiceDate(
  lastInvoiceSentAt: string | null,
  billingAnchorAt: Date | null,
  reference: Date,
): string {
  if (!billingAnchorAt) {
    return formatDate(reference);
  }
  const period = getActivationBillingPeriod(billingAnchorAt, reference);
  if (lastInvoiceSentAt) {
    const sent = new Date(lastInvoiceSentAt);
    if (!Number.isNaN(sent.getTime()) && sent.getTime() >= period.periodStart.getTime()) {
      return lastInvoiceSentAt;
    }
  }
  return period.periodStart.toISOString();
}

function buildPortalPayNow(params: {
  business: BusinessPortfolioRow;
  outstandingBilling: BusinessOutstandingBilling;
  account: BillingAccountDetailDto;
  access: PortalBillingAccessSnapshot;
  branding: PlatformBranding;
  paymentUpiVpa: string | null;
}): PortalPayNowDto {
  const { business, outstandingBilling, account, access, branding, paymentUpiVpa } = params;
  const amountInr = outstandingBilling.grandTotal;
  const emptyPayNow = {
    upiVpa: null as string | null,
    upiPayeeName: null as string | null,
    invoiceRef: null as string | null,
    timerSeconds: PORTAL_PAY_NOW_TIMER_SECONDS,
  };

  if (business.storeCount === 0) {
    return {
      available: false,
      amountInr,
      action: null,
      href: null,
      ...emptyPayNow,
      unavailableReason: "NO_STORES",
    };
  }

  if (amountInr <= 0) {
    return {
      available: false,
      amountInr,
      action: null,
      href: null,
      ...emptyPayNow,
      unavailableReason: "NO_CHARGE",
    };
  }

  if (account.paymentStatus === "WAIVED") {
    return {
      available: false,
      amountInr,
      action: null,
      href: null,
      ...emptyPayNow,
      unavailableReason: "WAIVED",
    };
  }

  if (
    outstandingBilling.unpaidPeriodCount === 0 &&
    access.isPaidForCurrentCycle
  ) {
    return {
      available: false,
      amountInr,
      action: null,
      href: null,
      ...emptyPayNow,
      unavailableReason: "ALREADY_PAID",
    };
  }

  const invoiceRef =
    account.lastInvoiceNumber ?? generateProvisionalInvoiceRef(new Date());

  if (!paymentUpiVpa) {
    return {
      available: false,
      amountInr,
      action: null,
      href: null,
      ...emptyPayNow,
      invoiceRef,
      unavailableReason: "NO_UPI",
    };
  }

  const upiPayeeName = branding.platformName.trim() || "FineSet";
  const href = buildUpiPaymentUri({
    vpa: paymentUpiVpa,
    payeeName: upiPayeeName,
    amountInr,
    transactionNote: invoiceRef,
  });

  return {
    available: true,
    amountInr,
    action: "upi",
    href,
    upiVpa: paymentUpiVpa,
    upiPayeeName,
    invoiceRef,
    timerSeconds: PORTAL_PAY_NOW_TIMER_SECONDS,
    unavailableReason: null,
  };
}

export async function getPortalBillingDetails(
  session: AppSession,
): Promise<PortalBillingDetailsDto> {
  if (session.role !== "BUSINESS_OWNER" && session.role !== "STORE_MANAGER") {
    throw new PortalBillingDetailsError("Forbidden", 403);
  }

  const portalSession = session as StorePortalSession;
  const business = await resolvePortalBusinessPortfolio(portalSession);
  if (!business) {
    throw new PortalBillingDetailsError("Business not found.", 404);
  }

  const reference = new Date();
  const [pricingConfig, cycleSettings, platformSettings, account] = await Promise.all([
    getActiveBillingPricingConfig(),
    getBillingCycleSettings(),
    getPlatformSettings(),
    getPortalBillingAccount(business),
  ]);

  const billingAnchorAt = await resolveBillingAnchorForBusinessKey(
    business.businessKey,
    account.billingAnchorAt ?? business.billingAnchorAt,
  );
  const settlement = settlementFromAccount(account);
  const outstandingBilling = calculateOutstandingBilling(business.stores, pricingConfig, {
    billingAnchorAt,
    settlement,
    reference,
  });
  const monthlyBilling =
    outstandingBilling.unpaidPeriodCount > 0
      ? consolidateOutstandingBilling(outstandingBilling)
      : calculateBusinessMonthlyBilling(business.stores, pricingConfig, {
          billingAnchorAt,
          reference,
        });
  const currentPeriod = billingAnchorAt
    ? getActivationBillingPeriod(billingAnchorAt, reference)
    : null;
  const restrictPortalOnOverdue = platformSettings.billing.restrictPortalOnOverdue;
  const portfolioPaymentStatus = getBusinessPaymentStatus(
    business,
    reference,
    account.paymentStatus,
    account.paidAt,
    cycleSettings,
    restrictPortalOnOverdue,
    account.paidThroughPeriodEnd,
  );
  const paymentStatusCopy = getBillingPaymentStatusLabel(portfolioPaymentStatus, cycleSettings);
  const access = buildPortalAccessSnapshot({
    account,
    billingAnchorAt,
    restrictPortalOnOverdue,
    role: session.role,
    reference,
  });
  const branding = brandingFromSettings(platformSettings);
  const paymentUpiVpa = resolvePaymentUpiVpa(platformSettings.general.paymentUpiVpa);
  const payNow = buildPortalPayNow({
    business,
    outstandingBilling,
    account,
    access,
    branding,
    paymentUpiVpa,
  });

  return applyDevBillingPendingMock(
    {
      businessKey: business.businessKey,
      businessName: business.businessName || business.businessKey,
      businessEmail: business.businessEmail,
      ownerName: business.ownerName,
      paymentStatus: account.paymentStatus,
      portfolioPaymentStatus,
      portfolioPaymentStatusLabel: paymentStatusCopy,
      renewalDueAt: currentPeriod?.dueDate.toISOString() ?? business.renewalDueAt,
      dataExpiryAt: currentPeriod?.periodEnd.toISOString() ?? business.dataExpiryAt,
      invoiceDate: resolvePortalInvoiceDate(
        account.lastInvoiceSentAt,
        billingAnchorAt,
        reference,
      ),
      paidAt: account.paidAt,
      lastInvoiceNumber: account.lastInvoiceNumber,
      lastInvoiceSentAt: account.lastInvoiceSentAt,
      invoiceLogs: account.invoiceLogs,
      monthlyBilling,
      outstandingBilling,
      pricingTiersSummary: formatPricingTiersSummary(
        pricingConfig,
        Math.round(pricingConfig.gstRate * 100),
      ),
      pricingTiers: buildPortalPricingTiers(pricingConfig),
      gstRatePercent: Math.round(pricingConfig.gstRate * 100),
      storeCount: business.storeCount,
      totalStaff: business.stores.reduce((sum, store) => sum + store.staffCount, 0),
      access,
      payNow,
    },
    reference,
  );
}

export async function buildPortalInvoicePreviewHtml(
  session: AppSession,
  invoiceLogId?: string,
): Promise<PortalInvoicePreviewDto> {
  if (session.role !== "BUSINESS_OWNER" && session.role !== "STORE_MANAGER") {
    throw new PortalBillingDetailsError("Forbidden", 403);
  }

  const portalSession = session as StorePortalSession;
  const business = await resolvePortalBusinessPortfolio(portalSession);
  if (!business) {
    throw new PortalBillingDetailsError("Business not found.", 404);
  }

  const reference = new Date();
  const [pricingConfig, cycleSettings, platformSettings, account, branding] = await Promise.all([
    getActiveBillingPricingConfig(),
    getBillingCycleSettings(),
    getPlatformSettings(),
    getPortalBillingAccount(business),
    getPlatformBranding(),
  ]);

  const billingAnchorAt = await resolveBillingAnchorForBusinessKey(
    business.businessKey,
    account.billingAnchorAt ?? business.billingAnchorAt,
  );
  const settlement = settlementFromAccount(account);
  const outstandingBilling = calculateOutstandingBilling(business.stores, pricingConfig, {
    billingAnchorAt,
    settlement,
    reference,
  });
  const billing =
    outstandingBilling.unpaidPeriodCount > 0
      ? consolidateOutstandingBilling(outstandingBilling)
      : calculateBusinessMonthlyBilling(business.stores, pricingConfig, {
          billingAnchorAt,
          reference,
        });
  const currentPeriod = billingAnchorAt
    ? getActivationBillingPeriod(billingAnchorAt, reference)
    : null;
  const restrictPortalOnOverdue = platformSettings.billing.restrictPortalOnOverdue;
  const portfolioStatus = getBusinessPaymentStatus(
    business,
    reference,
    account.paymentStatus,
    account.paidAt,
    cycleSettings,
    restrictPortalOnOverdue,
    account.paidThroughPeriodEnd,
  );
  const paymentStatus = getBillingPaymentStatusLabel(portfolioStatus, cycleSettings);

  const historicalLog = invoiceLogId
    ? account.invoiceLogs.find((log) => log.id === invoiceLogId)
    : undefined;

  if (invoiceLogId && !historicalLog) {
    throw new PortalBillingDetailsError("Invoice not found.", 404);
  }

  const invoiceNumber =
    historicalLog?.invoiceNumber ??
    account.lastInvoiceNumber ??
    generateProvisionalInvoiceRef(reference);
  const invoiceDate = historicalLog
    ? formatDate(historicalLog.createdAt)
    : formatDate(reference);
  const recipientEmail = business.businessEmail?.trim().toLowerCase() ?? "";

  const emailContent: InvoiceEmailContent = {
    invoiceNumber,
    invoiceDate,
    businessName: business.businessName,
    ownerName: business.ownerName ?? business.businessName,
    businessEmail: recipientEmail || "—",
    renewalDue: currentPeriod
      ? formatDate(currentPeriod.dueDate)
      : business.renewalDueAt
        ? formatDate(business.renewalDueAt)
        : "Not set",
    dataExpiry: currentPeriod
      ? formatDate(currentPeriod.periodEnd)
      : business.dataExpiryAt
        ? formatDate(business.dataExpiryAt)
        : "Not set",
    paymentStatus,
    siteUrl: getAppBaseUrl(),
    billing,
    outstandingBilling:
      outstandingBilling.unpaidPeriodCount > 0 ? outstandingBilling : undefined,
    platformName: branding.platformName,
    supportEmail: branding.supportEmail,
    showContactFooter: false,
  };

  return {
    invoiceNumber,
    html: renderInvoiceEmailHtml(emailContent),
    isHistorical: Boolean(historicalLog),
    historicalGrandTotal: historicalLog?.grandTotal ?? null,
    currentGrandTotal: billing.grandTotal,
  };
}
