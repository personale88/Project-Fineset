import { describe, expect, it } from "vitest";
import {
  countMergedStaffCallsFromRecords,
  countStaffCallFiltersFromRecords,
  type StaffCallFieldSaleCountRow,
  type StaffCallVisitCountRow,
  type StaffCallYearRecords,
} from "@/lib/services/staff-calls-filter-counts";

const staffId = "staff-1";
const storeId = "store-1";
const year = 2026;
const month = 6;
const visitDate = new Date(year, month - 1, 15);

let visitIdCounter = 0;
let fieldSaleIdCounter = 0;

function visit(overrides: Partial<StaffCallVisitCountRow> = {}): StaffCallVisitCountRow {
  visitIdCounter += 1;
  return {
    id: `visit-${visitIdCounter}`,
    staffId,
    visitDate,
    sourceChannel: "ORGANIC_WALK_IN",
    customerType: "NEW",
    purchaseStatus: "NOT_PURCHASED",
    callValueTier: "LOW",
    transactionAmount: null,
    budgetStated: "UNDER_15K",
    lastCallAnswered: null,
    birthMonth: month,
    anniversaryMonth: null,
    followUp: null,
    ...overrides,
  };
}

function fieldSale(
  overrides: Partial<StaffCallFieldSaleCountRow> = {},
): StaffCallFieldSaleCountRow {
  fieldSaleIdCounter += 1;
  return {
    id: `field-sale-${fieldSaleIdCounter}`,
    staffId,
    activityDate: visitDate,
    customerType: "NEW",
    enrollmentOutcome: null,
    callValueTier: "MID",
    monthlyCommitment: 20_000,
    lastCallAnswered: "NOT_ANSWERED",
    birthMonth: null,
    anniversaryMonth: null,
    followUp: null,
    ...overrides,
  };
}

describe("countStaffCallFiltersFromRecords", () => {
  const records: StaffCallYearRecords = {
    visits: [
      visit(),
      visit({
        sourceChannel: "REFERRAL",
        callValueTier: "HIGH",
        transactionAmount: 80_000,
        purchaseStatus: "PURCHASED",
        lastCallAnswered: "NOT_ANSWERED",
      }),
      visit({
        customerType: "REPEAT",
        followUp: { status: "OPEN", assignedStaffId: staffId },
      }),
    ],
    fieldSales: [fieldSale()],
  };

  it("counts masters, queues, and months in memory", () => {
    const filters = countStaffCallFiltersFromRecords(records, {
      staffId,
      storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "ALL",
      birthday: "ALL",
      anniversary: "ALL",
      year,
      month,
    });

    expect(filters.masters.find((item) => item.key === "ALL")?.count).toBe(4);
    expect(filters.masters.find((item) => item.key === "STORE_VISIT")?.count).toBe(2);
    expect(filters.masters.find((item) => item.key === "EXTERNAL")?.count).toBe(1);
    expect(filters.masters.find((item) => item.key === "FIELD_SALE")?.count).toBe(1);
    expect(filters.queues.find((item) => item.key === "NOT_ANSWERED")?.count).toBe(2);
    expect(filters.queues.find((item) => item.key === "FOLLOW_UP")?.count).toBe(1);
    expect(filters.birthdays.find((item) => item.key === "THIS_MONTH")?.count).toBe(3);
    expect(filters.months.find((item) => item.month === month)?.count).toBe(4);
    expect(filters.availableYears).toContain(year);
  });

  it("matches merged totals for active filters", () => {
    const dbParams = {
      staffId,
      storeId,
      master: "ALL" as const,
      segment: "ALL" as const,
      valueTier: "HIGH" as const,
      queue: "ALL" as const,
      birthday: "ALL" as const,
      anniversary: "ALL" as const,
      year,
      month,
    };

    expect(countMergedStaffCallsFromRecords(records, dbParams)).toBe(1);
  });
});
