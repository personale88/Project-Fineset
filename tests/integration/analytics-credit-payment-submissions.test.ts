import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashCredential } from "@/lib/auth/credentials";
import {
  analyticsCreditBusinessKey,
  createAnalyticsCreditPaymentSubmission,
} from "@/lib/services/analytics-credit-payment-submissions";
import { reviewBillingPaymentSubmission } from "@/lib/services/billing-payment-submissions";
import { getAnalyticsCreditPack } from "@/lib/analytics/credit-units";
import type { AppSession } from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("analytics credit payment submissions", () => {
  const runId = randomUUID().slice(0, 8);
  const email = `vitest-credits-${runId}@test.local`;
  let adminUserId: string;
  let session: AppSession;
  let submissionId: string;

  beforeAll(async () => {
    const admin = await prisma.appUser.create({
      data: {
        authId: randomUUID(),
        email,
        name: "Vitest Credits Admin",
        role: "MASTER_ADMIN",
        passwordHash: await hashCredential("VitestCredits#9test"),
        isActive: true,
        activatedAt: new Date(),
      },
      select: { id: true },
    });
    adminUserId = admin.id;
    session = {
      userId: admin.id,
      email,
      role: "MASTER_ADMIN",
      permissions: {},
    };
  }, 60_000);

  afterAll(async () => {
    await prisma.analyticsCreditLedger.deleteMany({
      where: { account: { appUserId: adminUserId } },
    });
    await prisma.analyticsCreditAccount.deleteMany({
      where: { appUserId: adminUserId },
    });
    await prisma.billingPaymentSubmission.deleteMany({
      where: { businessKey: analyticsCreditBusinessKey(adminUserId) },
    });
    await prisma.appUser.deleteMany({ where: { id: adminUserId } });
    await prisma.$disconnect();
  });

  it("creates a pending UPI submission for a credit pack", async () => {
    const submission = await createAnalyticsCreditPaymentSubmission(session, "starter");
    submissionId = submission.id;

    expect(submission.kind).toBe("ANALYTICS_CREDITS");
    expect(submission.status).toBe("PENDING");
    expect(submission.packId).toBe("starter");
    expect(submission.creditAmount).toBe(getAnalyticsCreditPack("starter")?.credits);
    expect(submission.upiVpa).toBeTruthy();
  });

  it("adds credits when the submission is marked RECEIVED", async () => {
    const before = await prisma.analyticsCreditAccount.findUnique({
      where: { appUserId: adminUserId },
      select: { balanceCredits: true },
    });

    const result = await reviewBillingPaymentSubmission({
      id: submissionId,
      status: "RECEIVED",
      reviewedByEmail: "reviewer@test.local",
    });

    expect(result.submission.status).toBe("RECEIVED");

    const after = await prisma.analyticsCreditAccount.findUnique({
      where: { appUserId: adminUserId },
      select: { balanceCredits: true },
    });
    const packCredits = getAnalyticsCreditPack("starter")?.credits ?? 0;

    expect(after?.balanceCredits).toBe((before?.balanceCredits ?? 0) + packCredits);

    const ledger = await prisma.analyticsCreditLedger.findFirst({
      where: {
        account: { appUserId: adminUserId },
        externalPaymentId: submissionId,
      },
    });
    expect(ledger?.type).toBe("RECHARGE");
    expect(ledger?.amount).toBe(packCredits);
  });
});

describe.skipIf(!hasDb)("analytics credit pending submission dedupe", () => {
  const runId = randomUUID().slice(0, 8);
  const email = `vitest-credits-dedupe-${runId}@test.local`;
  let adminUserId: string;
  let session: AppSession;

  beforeAll(async () => {
    const admin = await prisma.appUser.create({
      data: {
        authId: randomUUID(),
        email,
        name: "Vitest Credits Dedupe Admin",
        role: "MASTER_ADMIN",
        passwordHash: await hashCredential("VitestCredits#9test"),
        isActive: true,
        activatedAt: new Date(),
      },
      select: { id: true },
    });
    adminUserId = admin.id;
    session = {
      userId: admin.id,
      email,
      role: "MASTER_ADMIN",
      permissions: {},
    };
  }, 60_000);

  afterAll(async () => {
    await prisma.billingPaymentSubmission.deleteMany({
      where: { businessKey: analyticsCreditBusinessKey(adminUserId) },
    });
    await prisma.appUser.deleteMany({ where: { id: adminUserId } });
    await prisma.$disconnect();
  });

  it("EC-BE-068: refreshes existing pending submission instead of creating duplicates", async () => {
    const first = await createAnalyticsCreditPaymentSubmission(session, "starter");
    const second = await createAnalyticsCreditPaymentSubmission(session, "growth");

    expect(second.id).toBe(first.id);
    expect(second.status).toBe("PENDING");
    expect(second.packId).toBe("growth");
    expect(second.creditAmount).toBe(getAnalyticsCreditPack("growth")?.credits);

    const pendingCount = await prisma.billingPaymentSubmission.count({
      where: {
        businessKey: analyticsCreditBusinessKey(adminUserId),
        status: "PENDING",
      },
    });
    expect(pendingCount).toBe(1);
  });
});
