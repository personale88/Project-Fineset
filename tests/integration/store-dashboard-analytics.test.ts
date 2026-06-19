import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createVisit } from "@/lib/services/visits";
import { getStoreAnalytics } from "@/lib/services/analytics";
import { getStoreRsoPerformance } from "@/lib/services/rso-performance";
import { getStoreCallAnalytics } from "@/lib/services/store-call-analytics";
import {
  countVisitPurchaseStatus,
  buildVisitPurchaseStatusBreakdown,
} from "@/lib/utils/visit-analytics-breakdown";
import { parseCalendarDate } from "@/lib/utils/calendar-date";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("store dashboard purchase analytics integration", () => {
  let storeId: string;
  let staffId: string;
  const saleDate = parseCalendarDate(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  );

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: {
        name: "Dashboard Analytics Test Store",
        category: "JEWELRY",
        city: "Test City",
        state: "TS",
        businessOwnerName: "Owner",
        businessOwnerEmail: "dashboard-analytics-test@test.local",
      },
    });
    storeId = store.id;

    const staff = await prisma.staff.create({
      data: {
        name: "Dashboard Test RSO",
        employeeId: "DASH-RSO-001",
        role: "STAFF",
        storeId,
      },
    });
    staffId = staff.id;
  }, 60_000);

  afterAll(async () => {
    if (!storeId) return;
    await prisma.followUp.deleteMany({ where: { visit: { storeId } } });
    await prisma.visit.deleteMany({ where: { storeId } });
    await prisma.customer.deleteMany({ where: { storeId } });
    await prisma.staff.deleteMany({ where: { storeId } });
    await prisma.store.delete({ where: { id: storeId } });
    await prisma.$disconnect();
  });

  it("surfaces purchased and non-purchased visit data on store analytics", async () => {
    await createVisit({
      storeId,
      staffId,
      customerName: "Purchased Customer",
      customerPhone: "9876500001",
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      purchaseStatus: "PURCHASED",
      productsPurchased: ["FINGER_RINGS"],
      transactionAmount: 45000,
      productsExplored: ["FINGER_RINGS"],
      schemesPitched: ["NONE"],
      followUpNeeded: false,
      visitDate: saleDate,
    });

    await createVisit({
      storeId,
      staffId,
      customerName: "Browsing Customer",
      customerPhone: "9876500002",
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsPurchased: [],
      productsExplored: ["EAR_RINGS"],
      schemesPitched: ["NONE"],
      reasonNoPurchase: "BUDGET",
      followUpNeeded: false,
      visitDate: saleDate,
    });

    const analytics = await getStoreAnalytics(storeId, "today");
    const breakdown = analytics.purchaseStatusBreakdown ?? [];

    expect(countVisitPurchaseStatus(breakdown, "PURCHASED")).toBeGreaterThanOrEqual(1);
    expect(countVisitPurchaseStatus(breakdown, "NOT_PURCHASED")).toBeGreaterThanOrEqual(1);
    expect(analytics.kpis.totalVisits).toBeGreaterThanOrEqual(2);

    const rso = await getStoreRsoPerformance(storeId, "today");
    const row = rso.rows.find((entry) => entry.staffId === staffId);
    expect(row?.purchased).toBeGreaterThanOrEqual(1);
    expect(row?.notPurchased).toBeGreaterThanOrEqual(1);
    expect(row?.customersAttended).toBeGreaterThanOrEqual(2);

    const calls = await getStoreCallAnalytics(storeId, "today");
    expect(calls.visitLogByPurchaseStatus.some((entry) => entry.count > 0)).toBe(true);
    expect(
      countVisitPurchaseStatus(
        buildVisitPurchaseStatusBreakdown(
          calls.visitLogByPurchaseStatus.map((entry) => ({
            purchaseStatus: entry.status,
          })),
        ),
        "PURCHASED",
      ),
    ).toBeGreaterThanOrEqual(1);
  });
});
