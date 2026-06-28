import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { hashCredential } from "@/lib/auth/credentials";
import { createBillingFollowUp, updateBillingPaymentStatus } from "@/lib/services/billing-accounts";
import { grantAnalyticsCredits } from "@/lib/services/analytics-credits";
import { businessGroupKey } from "@/lib/utils/group-stores-by-business";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("admin portal production fixes", () => {
  const runId = randomUUID().slice(0, 8);
  let adminUserId: string;
  let businessKey: string;
  let testStoreId: string;

  beforeAll(async () => {
    let admin = await prisma.appUser.findFirst({
      where: { role: "MASTER_ADMIN", isActive: true },
      select: { id: true },
    });

    if (!admin) {
      admin = await prisma.appUser.create({
        data: {
          authId: randomUUID(),
          email: `vitest-admin-${runId}@test.local`,
          name: "Vitest Admin",
          role: "MASTER_ADMIN",
          passwordHash: await hashCredential("VitestAdmin#9test"),
          isActive: true,
          activatedAt: new Date(),
        },
        select: { id: true },
      });
    }

    adminUserId = admin.id;

    const ownerEmail = `vitest-owner-${runId}@test.local`;
    const store = await prisma.store.create({
      data: {
        name: `Vitest Billing Store ${runId}`,
        category: "JEWELRY",
        city: "Mumbai",
        state: "MH",
        businessOwnerName: "Vitest Owner",
        businessOwnerEmail: ownerEmail,
        isActive: true,
      },
    });
    testStoreId = store.id;
    businessKey = businessGroupKey({
      storeId: store.id,
      businessOwnerEmail: ownerEmail,
    });

    await prisma.billingBusinessAccount.upsert({
      where: { businessKey },
      create: {
        businessKey,
        businessName: "Vitest Owner",
        paymentStatus: "UNPAID",
      },
      update: {},
    });
  }, 60_000);

  afterAll(async () => {
    await prisma.authAuditLog.deleteMany({
      where: {
        email: { contains: runId },
      },
    });
    await prisma.analyticsCreditLedger.deleteMany({
      where: {
        description: { contains: runId },
      },
    });
    await prisma.billingFollowUp.deleteMany({
      where: { account: { businessKey } },
    });
    await prisma.billingBusinessAccount.deleteMany({
      where: { businessKey },
    });
    await prisma.store.deleteMany({
      where: { id: testStoreId },
    });
    await prisma.appUser.deleteMany({
      where: { email: { contains: runId } },
    });
    await prisma.$disconnect();
  });

  it("EC-BE-070: grants analytics credits and records a GRANT ledger entry", async () => {
    const before = await prisma.analyticsCreditAccount.findUnique({
      where: { appUserId: adminUserId },
      select: { balanceCredits: true },
    });

    await grantAnalyticsCredits({
      appUserId: adminUserId,
      credits: 5,
      description: `vitest grant ${runId}`,
    });

    const after = await prisma.analyticsCreditAccount.findUnique({
      where: { appUserId: adminUserId },
      select: { balanceCredits: true },
    });

    expect(after?.balanceCredits).toBe((before?.balanceCredits ?? 0) + 5);

    const ledger = await prisma.analyticsCreditLedger.findFirst({
      where: { description: { contains: runId } },
    });
    expect(ledger?.type).toBe("GRANT");
    expect(ledger?.amount).toBe(5);
  });

  it("logs billing follow-up and payment status audit events", async () => {
    const actorEmail = `admin-fix-${runId}@test.local`;

    await createBillingFollowUp({
      businessKey,
      channel: "EMAIL",
      outcome: "OTHER",
      notes: `vitest follow-up ${runId}`,
      createdByEmail: actorEmail,
    });

    const followUpEvent = await prisma.authAuditLog.findFirst({
      where: {
        event: "BILLING_FOLLOW_UP_CREATED",
        email: actorEmail,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(followUpEvent).not.toBeNull();

    await updateBillingPaymentStatus({
      businessKey,
      paymentStatus: "UNPAID",
      notes: `vitest status ${runId}`,
      createdByEmail: actorEmail,
    });

    const statusEvent = await prisma.authAuditLog.findFirst({
      where: {
        event: "BILLING_PAYMENT_STATUS_CHANGED",
        email: actorEmail,
      },
      orderBy: { createdAt: "desc" },
    });
    expect(statusEvent).not.toBeNull();
  });
});
