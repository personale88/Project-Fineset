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

  it("EC-BE-052: activates billing atomically when marked RECEIVED", async () => {
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

  it("EC-BE-050: returns 409 when reviewing an already-reviewed submission", async () => {
    const reviewed = await prisma.billingPaymentSubmission.create({
      data: {
        businessKey,
        businessName: "Vitest Payments",
        businessEmail: businessKey,
        invoiceNumber: `INV-REVIEWED-${runId}`,
        amountInr: 11_800,
        status: "RECEIVED",
        reviewedAt: new Date(),
        reviewedByEmail: "admin@test.local",
      },
    });

    await expect(
      reviewBillingPaymentSubmission({
        id: reviewed.id,
        status: "NOT_RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 409,
      message: "This payment has already been reviewed.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    await prisma.billingPaymentSubmission.delete({ where: { id: reviewed.id } });
  });

  it("EC-BE-051: returns 404 when payment submission is not found", async () => {
    await expect(
      reviewBillingPaymentSubmission({
        id: randomUUID(),
        status: "RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: "Payment submission not found.",
    } satisfies Partial<BillingPaymentSubmissionError>);
  });

  it("EC-BE-053: marks NOT_RECEIVED and returns notification payload", async () => {
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

describe.skipIf(!hasDb)("billing payment analytics credit review guard", () => {
  it("EC-BE-054: returns 400 when analytics credit submission is missing packId or appUserId", async () => {
    const edgeRunId = randomUUID().slice(0, 8);
    const appUserId = randomUUID();
    const businessKey = `analytics-credits:${appUserId}`;

    const missingPack = await prisma.billingPaymentSubmission.create({
      data: {
        kind: "ANALYTICS_CREDITS",
        businessKey,
        businessName: "Invalid credits submission",
        businessEmail: `credits-${edgeRunId}@test.local`,
        invoiceNumber: `CREDITS-INVALID-${edgeRunId}`,
        amountInr: 590,
        appUserId,
        packId: null,
        creditAmount: null,
        status: "PENDING",
      },
    });

    await expect(
      reviewBillingPaymentSubmission({
        id: missingPack.id,
        status: "RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid credit recharge submission.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    const missingUser = await prisma.billingPaymentSubmission.create({
      data: {
        kind: "ANALYTICS_CREDITS",
        businessKey: "analytics-credits:",
        businessName: "Invalid credits submission",
        businessEmail: `credits2-${edgeRunId}@test.local`,
        invoiceNumber: `CREDITS-INVALID2-${edgeRunId}`,
        amountInr: 590,
        appUserId: null,
        packId: "starter",
        creditAmount: 50,
        status: "PENDING",
      },
    });

    await expect(
      reviewBillingPaymentSubmission({
        id: missingUser.id,
        status: "RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid credit recharge submission.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    await prisma.billingPaymentSubmission.deleteMany({
      where: { id: { in: [missingPack.id, missingUser.id] } },
    });
  });

  it("EC-BE-056: returns 400 when analytics credit business key is invalid", async () => {
    const edgeRunId = randomUUID().slice(0, 8);

    const wrongFormat = await prisma.billingPaymentSubmission.create({
      data: {
        kind: "ANALYTICS_CREDITS",
        businessKey: `vitest-invalid-key-${edgeRunId}@test.local`,
        businessName: "Invalid credits key",
        businessEmail: `credits-key-${edgeRunId}@test.local`,
        invoiceNumber: `CREDITS-KEY-${edgeRunId}`,
        amountInr: 590,
        appUserId: null,
        packId: "starter",
        creditAmount: 50,
        status: "PENDING",
      },
    });

    await expect(
      reviewBillingPaymentSubmission({
        id: wrongFormat.id,
        status: "RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid credit recharge submission.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    const missingPrefixSuffix = await prisma.billingPaymentSubmission.create({
      data: {
        kind: "ANALYTICS_CREDITS",
        businessKey: "analytics-credits",
        businessName: "Invalid credits key",
        businessEmail: `credits-prefix-${edgeRunId}@test.local`,
        invoiceNumber: `CREDITS-PREFIX-${edgeRunId}`,
        amountInr: 590,
        appUserId: null,
        packId: "starter",
        creditAmount: 50,
        status: "PENDING",
      },
    });

    await expect(
      reviewBillingPaymentSubmission({
        id: missingPrefixSuffix.id,
        status: "RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid credit recharge submission.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    const whitespaceUserId = await prisma.billingPaymentSubmission.create({
      data: {
        kind: "ANALYTICS_CREDITS",
        businessKey: "analytics-credits:   ",
        businessName: "Invalid credits key",
        businessEmail: `credits-space-${edgeRunId}@test.local`,
        invoiceNumber: `CREDITS-SPACE-${edgeRunId}`,
        amountInr: 590,
        appUserId: null,
        packId: "starter",
        creditAmount: 50,
        status: "PENDING",
      },
    });

    await expect(
      reviewBillingPaymentSubmission({
        id: whitespaceUserId.id,
        status: "RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Invalid credit recharge submission.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    await prisma.billingPaymentSubmission.deleteMany({
      where: { id: { in: [wrongFormat.id, missingPrefixSuffix.id, whitespaceUserId.id] } },
    });
  });
});

describe.skipIf(!hasDb)("billing payment concurrent review", () => {
  it("EC-BE-055: returns 409 when concurrent double-review races on the same submission", async () => {
    const edgeRunId = randomUUID().slice(0, 8);
    const businessKey = `vitest-race-${edgeRunId}@test.local`;

    const submission = await prisma.billingPaymentSubmission.create({
      data: {
        businessKey,
        businessName: "Vitest Race",
        businessEmail: businessKey,
        invoiceNumber: `INV-RACE-${edgeRunId}`,
        amountInr: 5_900,
        status: "PENDING",
      },
    });

    const results = await Promise.allSettled([
      reviewBillingPaymentSubmission({
        id: submission.id,
        status: "NOT_RECEIVED",
        reviewedByEmail: "admin@test.local",
      }),
      reviewBillingPaymentSubmission({
        id: submission.id,
        status: "NOT_RECEIVED",
        reviewedByEmail: "reviewer@test.local",
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const failure = rejected[0] as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({
      status: 409,
      message: "This payment has already been reviewed.",
    } satisfies Partial<BillingPaymentSubmissionError>);

    const final = await prisma.billingPaymentSubmission.findUnique({
      where: { id: submission.id },
    });
    expect(final?.status).toBe("NOT_RECEIVED");

    await prisma.billingPaymentSubmission.delete({ where: { id: submission.id } });
  });
});

describe.skipIf(!hasDb)("billing payment submission portal guard", () => {
  it("EC-BE-049: rejects admin portal payment submit with 403", async () => {
    const masterAdmin: AppSession = {
      userId: "user-admin",
      email: "admin@test.local",
      role: "MASTER_ADMIN",
      permissions: {},
    };
    const platformAdmin: AppSession = {
      userId: "user-platform-admin",
      email: "platform-admin@test.local",
      role: "PLATFORM_ADMIN",
      permissions: { billing: true },
    };

    for (const session of [masterAdmin, platformAdmin]) {
      await expect(createBillingPaymentSubmissionFromPortal(session)).rejects.toMatchObject({
        status: 403,
        message: "Forbidden",
      } satisfies Partial<BillingPaymentSubmissionError>);
    }
  });
});
