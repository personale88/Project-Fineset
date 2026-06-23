import { beforeEach, describe, expect, it, vi } from "vitest";
import { startOfCalendarDay } from "@/lib/utils/calendar-date";
import { normalizeStoredFollowUpDate } from "@/lib/utils/follow-up-datetime";
import { updateFollowUp } from "@/lib/services/follow-ups";

const mockFollowUpFindFirst = vi.fn();
const mockTransaction = vi.fn();
const mockTxFollowUpUpdate = vi.fn();
const mockTxVisitUpdate = vi.fn();
const mockTxFieldSaleUpdate = vi.fn();

const mockFollowUp = {
  id: "fu-1",
  visitId: "visit-1",
  fieldSaleId: null,
  assignedStaffId: "staff-1",
  followUpDate: new Date("2024-01-01"),
  reason: "Callback",
  callOutcome: null,
  status: "OPEN" as const,
  visit: {
    storeId: "store-1",
    customerName: "encrypted-name",
    customerPhone: "encrypted-phone",
  },
  fieldSale: null,
  assignedStaff: { name: "Alex" },
};

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    followUp: {
      findFirst: (...args: unknown[]) => mockFollowUpFindFirst(...args),
    },
    $transaction: (callback: (tx: unknown) => Promise<unknown>) =>
      mockTransaction(callback),
  },
}));

vi.mock("@/lib/services/pii", () => ({
  decryptVisitPii: vi.fn(() => ({
    customerName: "Jane Doe",
    customerPhone: "+15551234567",
  })),
}));

vi.mock("@/lib/sync/notify-change", () => ({
  notifyPortalDataChangeNow: vi.fn(),
}));

describe("updateFollowUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFollowUpFindFirst.mockResolvedValue(mockFollowUp);
    mockTxFollowUpUpdate.mockResolvedValue(mockFollowUp);
    mockTransaction.mockImplementation(async (callback) =>
      callback({
        followUp: { update: mockTxFollowUpUpdate },
        visit: { update: mockTxVisitUpdate },
        fieldSale: { update: mockTxFieldSaleUpdate },
      }),
    );
  });

  it("returns null when follow-up is not found", async () => {
    mockFollowUpFindFirst.mockResolvedValue(null);

    const result = await updateFollowUp({
      followUpId: "missing",
      storeId: "store-1",
      input: { action: "close" },
    });

    expect(result).toBeNull();
  });

  it("closes follow-up and clears parent follow-up fields", async () => {
    const { notifyPortalDataChangeNow } = await import("@/lib/sync/notify-change");

    await updateFollowUp({
      followUpId: "fu-1",
      storeId: "store-1",
      input: { action: "close" },
    });

    expect(mockTxFollowUpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "fu-1" },
        data: expect.objectContaining({ status: "CLOSED" }),
      }),
    );
    expect(mockTxVisitUpdate).toHaveBeenCalledWith({
      where: { id: "visit-1" },
      data: { followUpNeeded: false, followUpDate: null },
    });
    expect(notifyPortalDataChangeNow).toHaveBeenCalledWith("store-1", [
      "followUps",
      "visits",
      "fieldSales",
      "callLogs",
    ]);
  });

  it("schedules follow-up with preferred time when provided", async () => {
    const scheduleWithTime = new Date(2026, 5, 25, 15, 30, 0, 0);
    const expectedDate = normalizeStoredFollowUpDate(scheduleWithTime);

    await updateFollowUp({
      followUpId: "fu-1",
      storeId: "store-1",
      input: { action: "schedule", followUpDate: scheduleWithTime },
    });

    expect(mockTxFollowUpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "OPEN",
          followUpDate: expectedDate,
        }),
      }),
    );
  });

  it("schedules follow-up with start-of-day date when no time is set", async () => {
    const scheduleDate = new Date(2026, 5, 25, 0, 0, 0, 0);
    const expectedDate = startOfCalendarDay(scheduleDate);

    await updateFollowUp({
      followUpId: "fu-1",
      storeId: "store-1",
      input: { action: "schedule", followUpDate: scheduleDate },
    });

    expect(mockTxFollowUpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "OPEN",
          followUpDate: expectedDate,
        }),
      }),
    );
    expect(mockTxVisitUpdate).toHaveBeenCalledWith({
      where: { id: "visit-1" },
      data: {
        followUpNeeded: true,
        followUpDate: expectedDate,
      },
    });
  });
});
