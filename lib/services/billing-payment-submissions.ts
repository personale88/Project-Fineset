import type { AppSession } from "@/types";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  applyBillingPaymentStatusInTransaction,
  ensureBillingAccount,
  finalizeBillingPaymentStatusSideEffects,
  resolvePaidThroughForPaidActivation,
} from "@/lib/services/billing-accounts";
import {
  getPortalBillingDetails,
  PortalBillingDetailsError,
} from "@/lib/services/portal-billing-details";
import type { BillingPaymentSubmissionStatus } from "@prisma/client";
import type { PaymentNotReceivedNotificationResult } from "@/lib/services/payment-not-received-notifications";

export class BillingPaymentSubmissionError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "BillingPaymentSubmissionError";
  }
}

export interface BillingPaymentSubmissionDto {
  id: string;
  businessKey: string;
  businessName: string;
  businessEmail: string | null;
  invoiceNumber: string | null;
  amountInr: number;
  upiVpa: string | null;
  submittedByEmail: string | null;
  submittedByName: string | null;
  status: BillingPaymentSubmissionStatus;
  reviewedAt: string | null;
  reviewedByEmail: string | null;
  createdAt: string;
}

function mapSubmission(row: {
  id: string;
  businessKey: string;
  businessName: string;
  businessEmail: string | null;
  invoiceNumber: string | null;
  amountInr: number;
  upiVpa: string | null;
  submittedByEmail: string | null;
  submittedByName: string | null;
  status: BillingPaymentSubmissionStatus;
  reviewedAt: Date | null;
  reviewedByEmail: string | null;
  createdAt: Date;
}): BillingPaymentSubmissionDto {
  return {
    id: row.id,
    businessKey: row.businessKey,
    businessName: row.businessName,
    businessEmail: row.businessEmail,
    invoiceNumber: row.invoiceNumber,
    amountInr: row.amountInr,
    upiVpa: row.upiVpa,
    submittedByEmail: row.submittedByEmail,
    submittedByName: row.submittedByName,
    status: row.status,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewedByEmail: row.reviewedByEmail,
    createdAt: row.createdAt.toISOString(),
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function buildSubmissionCreateData(
  details: Awaited<ReturnType<typeof getPortalBillingDetails>>,
  session: AppSession,
  amountInr: number,
) {
  return {
    businessKey: details.businessKey,
    businessName: details.businessName || details.businessKey,
    businessEmail: details.businessEmail,
    invoiceNumber: details.lastInvoiceNumber ?? details.payNow.invoiceRef,
    amountInr,
    upiVpa: details.payNow.upiVpa,
    submittedByEmail: session.email,
    submittedByName: details.ownerName,
  };
}

async function refreshPendingSubmission(
  submissionId: string,
  data: ReturnType<typeof buildSubmissionCreateData>,
) {
  const updated = await prisma.billingPaymentSubmission.update({
    where: { id: submissionId },
    data,
  });
  return mapSubmission(updated);
}

async function findPendingSubmissionForBusiness(businessKey: string) {
  return prisma.billingPaymentSubmission.findFirst({
    where: { businessKey, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

async function assertPendingSubmissionReviewable(id: string): Promise<void> {
  const current = await prisma.billingPaymentSubmission.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) {
    throw new BillingPaymentSubmissionError("Payment submission not found.", 404);
  }
  if (current.status !== "PENDING") {
    throw new BillingPaymentSubmissionError("This payment has already been reviewed.", 409);
  }
}

export async function createBillingPaymentSubmissionFromPortal(
  session: AppSession,
): Promise<BillingPaymentSubmissionDto> {
  if (session.role !== "BUSINESS_OWNER" && session.role !== "STORE_MANAGER") {
    throw new BillingPaymentSubmissionError("Forbidden", 403);
  }

  let details;
  try {
    details = await getPortalBillingDetails(session);
  } catch (error) {
    if (error instanceof PortalBillingDetailsError) {
      throw new BillingPaymentSubmissionError(error.message, error.status);
    }
    throw error;
  }

  const amountInr = details.outstandingBilling.grandTotal || details.payNow.amountInr;
  if (amountInr <= 0) {
    throw new BillingPaymentSubmissionError("No outstanding balance to confirm.", 400);
  }

  const createData = buildSubmissionCreateData(details, session, amountInr);
  const existingPending = await findPendingSubmissionForBusiness(details.businessKey);
  if (existingPending) {
    return refreshPendingSubmission(existingPending.id, createData);
  }

  try {
    const submission = await prisma.billingPaymentSubmission.create({
      data: createData,
    });
    return mapSubmission(submission);
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const pending = await findPendingSubmissionForBusiness(details.businessKey);
    if (!pending) {
      throw error;
    }
    return refreshPendingSubmission(pending.id, createData);
  }
}

export async function listBillingPaymentSubmissions(params?: {
  status?: BillingPaymentSubmissionStatus | "ALL";
  limit?: number;
}): Promise<BillingPaymentSubmissionDto[]> {
  const status = params?.status ?? "PENDING";
  const limit = params?.limit ?? 50;

  const rows = await prisma.billingPaymentSubmission.findMany({
    where: status === "ALL" ? undefined : { status },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(mapSubmission);
}

export async function reviewBillingPaymentSubmission(params: {
  id: string;
  status: Extract<BillingPaymentSubmissionStatus, "RECEIVED" | "NOT_RECEIVED">;
  reviewedByEmail: string;
}): Promise<{
  submission: BillingPaymentSubmissionDto;
  notifications?: PaymentNotReceivedNotificationResult;
}> {
  const existing = await prisma.billingPaymentSubmission.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    throw new BillingPaymentSubmissionError("Payment submission not found.", 404);
  }

  if (existing.status !== "PENDING") {
    throw new BillingPaymentSubmissionError("This payment has already been reviewed.", 409);
  }

  const now = new Date();

  if (params.status === "RECEIVED") {
    const invoiceLabel = existing.invoiceNumber?.trim() || "—";
    const notes = `UPI payment confirmed for invoice ${invoiceLabel}.`;
    const account = await ensureBillingAccount(existing.businessKey);
    const accountRecord = await prisma.billingBusinessAccount.findUnique({
      where: { id: account.id },
      select: { id: true, paidThroughPeriodEnd: true },
    });
    if (!accountRecord) {
      throw new BillingPaymentSubmissionError("Billing account not found.", 404);
    }

    const paidThroughPeriodEnd = await resolvePaidThroughForPaidActivation(
      existing.businessKey,
      accountRecord.paidThroughPeriodEnd,
      now,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const reviewResult = await tx.billingPaymentSubmission.updateMany({
        where: { id: params.id, status: "PENDING" },
        data: {
          status: "RECEIVED",
          reviewedAt: now,
          reviewedByEmail: params.reviewedByEmail,
        },
      });

      if (reviewResult.count === 0) {
        await assertPendingSubmissionReviewable(params.id);
      }

      await applyBillingPaymentStatusInTransaction(tx, {
        accountId: accountRecord.id,
        paymentStatus: "PAID",
        notes,
        createdByEmail: params.reviewedByEmail,
        now,
        paidThroughPeriodEnd,
      });

      return tx.billingPaymentSubmission.findUniqueOrThrow({
        where: { id: params.id },
      });
    });

    await finalizeBillingPaymentStatusSideEffects({
      businessKey: existing.businessKey,
      paymentStatus: "PAID",
      notes,
      createdByEmail: params.reviewedByEmail,
      forceImmediateActivation: true,
    });

    return { submission: mapSubmission(updated) };
  }

  const reviewResult = await prisma.billingPaymentSubmission.updateMany({
    where: { id: params.id, status: "PENDING" },
    data: {
      status: "NOT_RECEIVED",
      reviewedAt: now,
      reviewedByEmail: params.reviewedByEmail,
    },
  });

  if (reviewResult.count === 0) {
    await assertPendingSubmissionReviewable(params.id);
  }

  const updated = await prisma.billingPaymentSubmission.findUniqueOrThrow({
    where: { id: params.id },
  });

  const { sendPaymentNotReceivedNotifications } = await import(
    "@/lib/services/payment-not-received-notifications"
  );
  const notifications = await sendPaymentNotReceivedNotifications({
    businessKey: existing.businessKey,
    businessName: existing.businessName,
    businessEmail: existing.businessEmail,
    invoiceNumber: existing.invoiceNumber,
    amountInr: existing.amountInr,
    submittedByName: existing.submittedByName,
    reviewedByEmail: params.reviewedByEmail,
  });

  return { submission: mapSubmission(updated), notifications };
}

export async function countPendingBillingPaymentSubmissions(): Promise<number> {
  return prisma.billingPaymentSubmission.count({
    where: { status: "PENDING" },
  });
}
