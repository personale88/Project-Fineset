import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createBillingPaymentSubmissionFromPortal,
  reviewBillingPaymentSubmission,
  BillingPaymentSubmissionError,
} from "@/lib/services/billing-payment-submissions";
import type { AppSession } from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("billing payment submissions", () => {
  const runId = randomUUID().slice(0, 8);
  const businessKey = `vitest-payments-${runId}@test.local`;
  let submissionId: string;

  beforeAll(async () => {
    await prisma.billingBusinessAccount.create({
      data: {
        businessKey,
        businessName: "Vitest Payments",
        businessEmail: businessKey,
        paymentStatus: "UNPAID",
      },
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.billingPaymentSubmission.deleteMany({ where: { businessKey } });
    await prisma.billingFollowUp.deleteMany({
      where: { account: { businessKey } },
    });
    await prisma.billingBusinessAccount.deleteMany({ where: { businessKey } });
    await prisma.$disconnect();
  });

  it("activates billing atomically when marked RECEIVED", async () => {
    const submission = await prisma.billingPaymentSubmission.create({
      data: {
        businessKey,
        businessName: "Vitest Payments",
        businessEmail: businessKey,
        invoiceNumber: `INV-${runId}`,
        amountInr: 11_800,
        upiVpa: "fineset@paytm",
        submittedByEmail: businessKey,
        status: "PENDING",
      },
    });
    submissionId = submission.id;

    const result = await reviewBillingPaymentSubmission({
      id: submission.id,
      status: "RECEIVED",
      reviewedByEmail: "admin@test.local",
    });

    expect(result.submission.status).toBe("RECEIVED");
    expect(result.submission.reviewedByEmail).toBe("admin@test.local");

    const account = await prisma.billingBusinessAccount.findUnique({
      where: { businessKey },
    });
    expect(account?.paymentStatus).toBe("PAID");
    expect(account?.paidAt).not.toBeNull();
  });

  it("rejects reviewing a submission that is no longer pending", async () => {
    await expect(
      reviewBillingPaymentSubmission({
        id: submissionId,
        status: "NOT_RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 409,
    } satisfies Partial<BillingPaymentSubmissionError>);
  });

  it("returns NOT_RECEIVED notifications payload", async () => {
    const submission = await prisma.billingPaymentSubmission.create({
      data: {
        businessKey: `${runId}-not-received@test.local`,
        businessName: "Vitest Not Received",
        businessEmail: `${runId}-not-received@test.local`,
        invoiceNumber: `INV-NR-${runId}`,
        amountInr: 5_900,
        status: "PENDING",
      },
    });

    const result = await reviewBillingPaymentSubmission({
      id: submission.id,
      status: "NOT_RECEIVED",
      reviewedByEmail: "admin@test.local",
    });

    expect(result.submission.status).toBe("NOT_RECEIVED");
    expect(result.notifications).toEqual(
      expect.objectContaining({
        emailSent: expect.any(Boolean),
        whatsAppSent: expect.any(Boolean),
        whatsAppQueued: expect.any(Boolean),
      }),
    );

    await prisma.billingPaymentSubmission.delete({ where: { id: submission.id } });
  });
});

describe.skipIf(!hasDb)("billing payment submission portal guard", () => {
  it("rejects portal create for admin sessions", async () => {
    const session: AppSession = {
      userId: "user-admin",
      email: "admin@test.local",
      role: "MASTER_ADMIN",
      permissions: {},
    };

    await expect(createBillingPaymentSubmissionFromPortal(session)).rejects.toMatchObject({
      status: 403,
    } satisfies Partial<BillingPaymentSubmissionError>);
  });
});
