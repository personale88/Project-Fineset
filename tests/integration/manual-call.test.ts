import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { recordManualStaffCall } from "@/lib/services/staff-calls";
import { seedStaffCallsFixtures, disconnectStaffCallsSeed } from "@/tests/fixtures/staff-calls-seed";

const hasDb = Boolean(process.env.DATABASE_URL);

vi.mock("@/lib/sync/broadcaster", () => ({
  broadcastSyncEvent: vi.fn(),
}));

describe.skipIf(!hasDb)("manual call integration", () => {
  let fixtures: Awaited<ReturnType<typeof seedStaffCallsFixtures>>;

  beforeAll(async () => {
    fixtures = await seedStaffCallsFixtures();
  }, 60_000);

  afterAll(async () => {
    await disconnectStaffCallsSeed();
  });

  it("creates visit and call log atomically on success", async () => {
    const phone = `98${String(Date.now()).slice(-8)}`;
    const result = await recordManualStaffCall({
      customerName: "Manual Call Test",
      customerPhone: phone,
      customerType: "NEW",
      staffNotes: "Integration test",
      answered: "ANSWERED",
      feedback: "Interested in gold chain",
      scheduleFollowUp: false,
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
    });

    expect(result.visitId).toBeTruthy();

    const visit = await prisma.visit.findUnique({ where: { id: result.visitId! } });
    const callLog = await prisma.staffCallLog.findFirst({
      where: { visitId: result.visitId! },
    });

    expect(visit).not.toBeNull();
    expect(callLog).not.toBeNull();

    await prisma.staffCallLog.deleteMany({ where: { visitId: result.visitId! } });
    await prisma.visit.delete({ where: { id: result.visitId! } });
  });
});
