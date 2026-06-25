import type { AppSession } from "@/types";
import { Prisma } from "@prisma/client";
import { getAnalyticsCreditPack } from "@/lib/analytics/credit-units";
import { brandingFromSettings } from "@/lib/platform/branding";
import { prisma } from "@/lib/db/prisma";
import type { PortalPayNowDto } from "@/lib/services/portal-billing-details";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import {
  buildUpiPaymentUri,
  PORTAL_PAY_NOW_TIMER_SECONDS,
  resolvePaymentUpiVpa,
} from "@/lib/utils/upi-payment";
import type { BillingPaymentSubmissionDto } from "@/lib/services/billing-payment-submissions";
import { mapBillingPaymentSubmission } from "@/lib/services/billing-payment-submissions";

export class AnalyticsCreditPaymentSubmissionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AnalyticsCreditPaymentSubmissionError";
  }
}

export function analyticsCreditBusinessKey(appUserId: string): string {
  return `analytics-credits:${appUserId}`;
}

export function isAnalyticsCreditBusinessKey(businessKey: string): boolean {
  return businessKey.startsWith("analytics-credits:");
}

export function appUserIdFromAnalyticsCreditBusinessKey(businessKey: string): string | null {
  if (!isAnalyticsCreditBusinessKey(businessKey)) return null;
  const appUserId = businessKey.slice("analytics-credits:".length).trim();
  return appUserId || null;
}

export function isAnalyticsCreditUpiConfigured(
  configuredVpa?: string | null,
): boolean {
  return Boolean(resolvePaymentUpiVpa(configuredVpa));
}

function generateCreditPaymentReference(packId: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  return `CREDITS-${packId.toUpperCase()}-${stamp}`;
}

export async function buildAnalyticsCreditPayNow(
  packId: string,
): Promise<{ pack: NonNullable<ReturnType<typeof getAnalyticsCreditPack>>; payNow: PortalPayNowDto }> {
  const pack = getAnalyticsCreditPack(packId);
  if (!pack) {
    throw new AnalyticsCreditPaymentSubmissionError("Unknown recharge pack.", 400);
  }

  const settings = await getPlatformSettings();
  const invoiceRef = generateCreditPaymentReference(pack.id);

  if (!isAnalyticsCreditUpiConfigured(settings.general.paymentUpiVpa)) {
    return {
      pack,
      payNow: {
        available: false,
        amountInr: pack.priceInr,
        action: null,
        href: null,
        upiVpa: null,
        upiPayeeName: null,
        invoiceRef,
        timerSeconds: PORTAL_PAY_NOW_TIMER_SECONDS,
        unavailableReason: "NO_UPI",
      },
    };
  }

  const branding = brandingFromSettings(settings);
  const paymentUpiVpa = resolvePaymentUpiVpa(settings.general.paymentUpiVpa)!;
  const upiPayeeName = branding.platformName.trim() || "FineSet";
  const href = buildUpiPaymentUri({
    vpa: paymentUpiVpa,
    payeeName: upiPayeeName,
    amountInr: pack.priceInr,
    transactionNote: invoiceRef,
  });

  return {
    pack,
    payNow: {
      available: true,
      amountInr: pack.priceInr,
      action: "upi",
      href,
      upiVpa: paymentUpiVpa,
      upiPayeeName,
      invoiceRef,
      timerSeconds: PORTAL_PAY_NOW_TIMER_SECONDS,
      unavailableReason: null,
    },
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function findPendingAnalyticsCreditSubmission(appUserId: string) {
  return prisma.billingPaymentSubmission.findFirst({
    where: {
      businessKey: analyticsCreditBusinessKey(appUserId),
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });
}

async function refreshPendingAnalyticsCreditSubmission(
  submissionId: string,
  data: {
    businessName: string;
    businessEmail: string | null;
    invoiceNumber: string;
    amountInr: number;
    upiVpa: string | null;
    submittedByEmail: string;
    submittedByName: string | null;
    packId: string;
    creditAmount: number;
  },
): Promise<BillingPaymentSubmissionDto> {
  const updated = await prisma.billingPaymentSubmission.update({
    where: { id: submissionId },
    data,
  });
  return mapBillingPaymentSubmission(updated);
}

const UPI_NOT_CONFIGURED_MESSAGE =
  "UPI billing is not configured. Set a billing UPI ID in Admin → Settings, or set BILLING_UPI_VPA in your server environment.";

export async function createAnalyticsCreditPaymentSubmission(
  session: AppSession,
  packId: string,
): Promise<BillingPaymentSubmissionDto> {
  if (session.role !== "MASTER_ADMIN") {
    throw new AnalyticsCreditPaymentSubmissionError("Forbidden", 403);
  }

  const { pack, payNow } = await buildAnalyticsCreditPayNow(packId);
  if (!payNow.available || !payNow.upiVpa) {
    throw new AnalyticsCreditPaymentSubmissionError(UPI_NOT_CONFIGURED_MESSAGE, 400);
  }

  const appUser = await prisma.appUser.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  if (!appUser) {
    throw new AnalyticsCreditPaymentSubmissionError("User not found.", 404);
  }

  const businessKey = analyticsCreditBusinessKey(appUser.id);
  const businessName = `${appUser.name?.trim() || appUser.email} — AI Credits (${pack.label})`;
  const invoiceNumber = payNow.invoiceRef ?? generateCreditPaymentReference(pack.id);
  const createData = {
    kind: "ANALYTICS_CREDITS" as const,
    businessKey,
    businessName,
    businessEmail: appUser.email,
    invoiceNumber,
    amountInr: pack.priceInr,
    upiVpa: payNow.upiVpa,
    submittedByEmail: session.email,
    submittedByName: appUser.name,
    appUserId: appUser.id,
    packId: pack.id,
    creditAmount: pack.credits,
  };

  const existingPending = await findPendingAnalyticsCreditSubmission(appUser.id);
  if (existingPending) {
    return refreshPendingAnalyticsCreditSubmission(existingPending.id, createData);
  }

  try {
    const submission = await prisma.billingPaymentSubmission.create({
      data: createData,
    });
    return mapBillingPaymentSubmission(submission);
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const pending = await findPendingAnalyticsCreditSubmission(appUser.id);
    if (!pending) {
      throw error;
    }
    return refreshPendingAnalyticsCreditSubmission(pending.id, createData);
  }
}

export async function getPendingAnalyticsCreditSubmission(
  appUserId: string,
): Promise<BillingPaymentSubmissionDto | null> {
  const pending = await findPendingAnalyticsCreditSubmission(appUserId);
  return pending ? mapBillingPaymentSubmission(pending) : null;
}
