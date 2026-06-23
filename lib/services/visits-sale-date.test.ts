import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatCalendarDate,
  parseCalendarDate,
  resolveCalendarDayFromInstant,
} from "@/lib/utils/calendar-date";
import { normalizeStoredFollowUpDate } from "@/lib/utils/follow-up-datetime";
import { createVisit } from "@/lib/services/visits";

const mockCustomerUpsert = vi.fn();
const mockVisitCreate = vi.fn();
const mockFollowUpCreate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db/ensure-production-customer-schema", () => ({
  ensureProductionCustomerSchema: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: (callback: (tx: unknown) => Promise<unknown>) =>
      mockTransaction(callback),
  },
}));

vi.mock("@/lib/services/pii", () => ({
  prepareCustomerPii: vi.fn(() => ({
    name: "encrypted-name",
    phone: "encrypted-phone",
    phoneHash: "hash-1",
    nameSearch: "jane",
    phoneLast4: "3210",
    customerNameSearch: "jane",
  })),
  decryptVisitPii: vi.fn((visit: unknown) => visit),
}));

vi.mock("@/lib/services/call-record-denorm", () => ({
  visitDenormFields: vi.fn(() => ({})),
}));

vi.mock("@/lib/sync/broadcaster", () => ({
  broadcastSyncEvent: vi.fn(),
}));

vi.mock("@/lib/sync/notify-change", () => ({
  notifyPortalDataChangeNow: vi.fn(),
}));

const baseVisitInput = {
  storeId: "store-1",
  staffId: "staff-1",
  customerName: "Jane Doe",
  customerPhone: "9876543210",
  customerType: "NEW" as const,
  visitType: "WALK_IN" as const,
  sourceChannel: "ORGANIC_WALK_IN" as const,
  purchaseStatus: "NOT_PURCHASED" as const,
  productsPurchased: [],
  productsExplored: ["FINGER_RINGS" as const],
  schemesPitched: ["NONE" as const],
  followUpNeeded: false,
};

describe("createVisit sale date handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerUpsert.mockResolvedValue({
      id: "customer-1",
      dateOfBirth: null,
      anniversary: null,
    });
    mockVisitCreate.mockImplementation(async ({ data }: { data: { visitDate: Date } }) => ({
      id: "visit-1",
      ...data,
      customerName: "Jane Doe",
      customerPhone: "9876543210",
    }));
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        customer: { upsert: mockCustomerUpsert },
        visit: { create: mockVisitCreate },
        followUp: { create: mockFollowUpCreate },
      }),
    );
  });

  it("stores a backdated sale on the selected calendar day without inTime", async () => {
    const backdatedSale = parseCalendarDate("2026-06-10");

    await createVisit({
      ...baseVisitInput,
      visitDate: backdatedSale,
    });

    expect(mockVisitCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          visitDate: resolveCalendarDayFromInstant(backdatedSale),
          inTime: undefined,
        }),
      }),
    );
    expect(formatCalendarDate(mockVisitCreate.mock.calls[0][0].data.visitDate)).toBe(
      "2026-06-10",
    );
  });

  it("stores today's sale with inTime when provided", async () => {
    const todaySale = parseCalendarDate(formatCalendarDate(new Date()));
    const inTime = parseCalendarDate(formatCalendarDate(new Date()));
    inTime.setHours(11, 30, 0, 0);

    await createVisit({
      ...baseVisitInput,
      visitDate: todaySale,
      inTime,
    });

    const saved = mockVisitCreate.mock.calls[0][0].data;
    expect(formatCalendarDate(saved.visitDate)).toBe(formatCalendarDate(todaySale));
    expect(saved.inTime).toBeDefined();
    expect(formatCalendarDate(saved.inTime)).toBe(formatCalendarDate(todaySale));
    expect(saved.inTime.getHours()).toBe(11);
    expect(saved.inTime.getMinutes()).toBe(30);
  });

  it("preserves normalized picker sale date (regression for UTC server shift)", async () => {
    const normalizedClientDate = parseCalendarDate("2026-06-18");

    await createVisit({
      ...baseVisitInput,
      visitDate: normalizedClientDate,
    });

    expect(formatCalendarDate(mockVisitCreate.mock.calls[0][0].data.visitDate)).toBe(
      "2026-06-18",
    );
  });

  it("normalizes follow-up date to start of calendar day", async () => {
    const saleDate = parseCalendarDate("2026-06-10");
    const followUpDate = parseCalendarDate("2026-06-15");

    await createVisit({
      ...baseVisitInput,
      visitDate: saleDate,
      followUpNeeded: true,
      followUpDate,
    });

    expect(mockFollowUpCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          followUpDate: normalizeStoredFollowUpDate(followUpDate),
        }),
      }),
    );
  });
});
