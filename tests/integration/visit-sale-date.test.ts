import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { createVisit } from "@/lib/services/visits";
import {
  endOfCalendarDay,
  formatCalendarDate,
  normalizeCalendarPickerDate,
  parseCalendarDate,
  startOfCalendarDay,
} from "@/lib/utils/calendar-date";
import { formatDate } from "@/lib/utils/formatters";

const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("EC-BE-066: visit sale date parsing and boundaries", () => {
  let storeId: string;
  let staffId: string;
  const createdVisitIds: string[] = [];

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: {
        name: "Sale Date Test Store",
        category: "JEWELRY",
        city: "Test City",
        state: "TS",
        businessOwnerName: "Owner",
        businessOwnerEmail: "sale-date-test@test.local",
      },
    });
    storeId = store.id;

    const staff = await prisma.staff.create({
      data: {
        name: "Sale Date Test Staff",
        employeeId: "SALE-DATE-001",
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

  async function logVisit(visitDate: Date, phoneSuffix: string) {
    const visit = await createVisit({
      storeId,
      staffId,
      customerName: `Sale Date Customer ${phoneSuffix}`,
      customerPhone: `98765${phoneSuffix}`,
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsPurchased: [],
      productsExplored: ["FINGER_RINGS"],
      schemesPitched: ["NONE"],
      followUpNeeded: false,
      visitDate,
    });
    createdVisitIds.push(visit.id);
    return visit;
  }

  it("persists a backdated sale on the selected calendar day", async () => {
    const backdated = parseCalendarDate("2026-06-03");
    const visit = await logVisit(backdated, "43210");

    const stored = await prisma.visit.findUniqueOrThrow({
      where: { id: visit.id },
      select: { visitDate: true, inTime: true },
    });

    expect(formatCalendarDate(stored.visitDate)).toBe("2026-06-03");
    expect(formatDate(stored.visitDate)).toContain("Jun 2026");
    expect(stored.inTime).toBeNull();
  });

  it("persists today's normalized picker date without shifting a day", async () => {
    const pickerToday = normalizeCalendarPickerDate(new Date());
    const visit = await logVisit(pickerToday, "43211");

    const stored = await prisma.visit.findUniqueOrThrow({
      where: { id: visit.id },
      select: { visitDate: true },
    });

    expect(formatCalendarDate(stored.visitDate)).toBe(formatCalendarDate(new Date()));
  });

  it("persists explicit backdated picker midnight after normalization", async () => {
    const pickerBackdate = normalizeCalendarPickerDate(new Date(2026, 5, 12, 0, 0, 0));
    const visit = await logVisit(pickerBackdate, "43212");

    const stored = await prisma.visit.findUniqueOrThrow({
      where: { id: visit.id },
      select: { visitDate: true },
    });

    expect(formatCalendarDate(stored.visitDate)).toBe("2026-06-12");
  });

  it("lists backdated visit under the selected sale date filter", async () => {
    const backdated = parseCalendarDate("2026-06-03");
    const visit = await logVisit(backdated, "43213");

    const listed = await prisma.visit.findMany({
      where: {
        storeId,
        visitDate: {
          gte: startOfCalendarDay("2026-06-03"),
          lte: endOfCalendarDay("2026-06-03"),
        },
      },
      select: { id: true },
    });

    expect(listed.map((row) => row.id)).toContain(visit.id);
  });
});
