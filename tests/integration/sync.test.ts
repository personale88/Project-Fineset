import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createVisit } from "@/lib/services/visits";
import { computeSyncVersion, computeSyncVersionLight } from "@/lib/sync/version";
import type { StaffSession } from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("sync version with database", () => {
  it("builds a version string for admin scope", async () => {
    await prisma.$connect();
    const payload = await computeSyncVersion(
      {
        role: "MASTER_ADMIN",
        userId: "test-admin",
        email: "admin@test.local",
        permissions: {
          portfolio: true,
          accounts: true,
          analytics: true,
          billing: true,
        },
      },
      ["stores"],
    );
    expect(payload.scope).toBe("all");
    expect(payload.version).toContain("all");
  });
});

describe.skipIf(!hasDb)("EC-BE-067: sync version conflicts with database", () => {
  const runId = randomUUID().slice(0, 8);
  let storeId: string;
  let staffId: string;

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: {
        name: `Sync Version Store ${runId}`,
        city: "Mumbai",
        state: "MH",
      },
    });
    storeId = store.id;

    const staff = await prisma.staff.create({
      data: {
        name: "Sync Version Staff",
        employeeId: `SYNC${runId}`,
        storeId,
        role: "STAFF",
        isActive: true,
      },
    });
    staffId = staff.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.followUp.deleteMany({ where: { visit: { storeId } } });
    await prisma.visit.deleteMany({ where: { storeId } });
    await prisma.customer.deleteMany({ where: { storeId } });
    await prisma.staff.deleteMany({ where: { id: staffId } });
    await prisma.store.deleteMany({ where: { id: storeId } });
    await prisma.$disconnect();
  }, 60_000);

  it("bumps scoped sync version when store data changes", async () => {
    const session: StaffSession = {
      role: "STAFF",
      userId: `sync-user-${runId}`,
      email: `sync-${runId}@test.local`,
      storeId,
      staffId,
      name: "Sync Version Staff",
      employeeId: `SYNC${runId}`,
    };

    const before = await computeSyncVersionLight(session);
    const beforeFull = await computeSyncVersion(session, ["visits"]);

    await createVisit({
      storeId,
      staffId,
      customerName: "Sync Version Customer",
      customerPhone: `98765${runId.slice(0, 5)}`,
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsPurchased: [],
      productsExplored: ["FINGER_RINGS"],
      schemesPitched: ["NONE"],
      followUpNeeded: false,
    });

    const after = await computeSyncVersionLight(session);
    const afterFull = await computeSyncVersion(session, ["visits"]);

    expect(after.version).not.toBe(before.version);
    expect(afterFull.version).not.toBe(beforeFull.version);
    expect(new Date(after.lastChangedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before.lastChangedAt).getTime(),
    );
    expect(after.scope).toBe(storeId);
  });
});
