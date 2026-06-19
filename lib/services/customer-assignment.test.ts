import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assignCustomerToStaff,
  bulkAssignFollowUps,
  CustomerAssignmentError,
} from "@/lib/services/customer-assignment";

const mockStaffFindFirst = vi.fn();
const mockVisitFindFirst = vi.fn();
const mockVisitUpdate = vi.fn();
const mockFollowUpFindFirst = vi.fn();
const mockFollowUpUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    staff: {
      findFirst: (...args: unknown[]) => mockStaffFindFirst(...args),
    },
    visit: {
      findFirst: (...args: unknown[]) => mockVisitFindFirst(...args),
      update: (...args: unknown[]) => mockVisitUpdate(...args),
    },
    followUp: {
      findFirst: (...args: unknown[]) => mockFollowUpFindFirst(...args),
      update: (...args: unknown[]) => mockFollowUpUpdate(...args),
    },
    $transaction: (callback: (tx: unknown) => Promise<void>) => mockTransaction(callback),
  },
}));

vi.mock("@/lib/sync/broadcaster", () => ({
  broadcastSyncEvent: vi.fn(),
}));

describe("assignCustomerToStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaffFindFirst.mockResolvedValue({ id: "staff-2", name: "Priya" });
    mockVisitFindFirst.mockResolvedValue({
      id: "visit-1",
      staffId: "staff-1",
      customerName: "Asha",
      followUp: { id: "follow-1", status: "OPEN" },
    });
    mockTransaction.mockImplementation(async (callback) => {
      await callback({
        visit: { update: mockVisitUpdate },
        followUp: { update: mockFollowUpUpdate },
      });
    });
  });

  it("moves visit and open follow-up to the selected staff member", async () => {
    const result = await assignCustomerToStaff({
      storeId: "store-1",
      targetStaffId: "staff-2",
      visitId: "visit-1",
    });

    expect(result.newStaffId).toBe("staff-2");
    expect(result.previousStaffId).toBe("staff-1");
    expect(mockVisitUpdate).toHaveBeenCalledWith({
      where: { id: "visit-1" },
      data: { staffId: "staff-2" },
    });
    expect(mockFollowUpUpdate).toHaveBeenCalledWith({
      where: { id: "follow-1" },
      data: { assignedStaffId: "staff-2" },
    });
  });

  it("rejects assigning to the same staff member", async () => {
    mockVisitFindFirst.mockResolvedValue({
      id: "visit-1",
      staffId: "staff-2",
      customerName: "Asha",
      followUp: null,
    });

    await expect(
      assignCustomerToStaff({
        storeId: "store-1",
        targetStaffId: "staff-2",
        visitId: "visit-1",
      }),
    ).rejects.toMatchObject({
      code: "SAME_STAFF",
    } satisfies Partial<CustomerAssignmentError>);
  });
});

describe("bulkAssignFollowUps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaffFindFirst.mockResolvedValue({ id: "staff-2", name: "Priya" });
    mockTransaction.mockImplementation(async (callback) => {
      await callback({
        visit: { update: mockVisitUpdate },
        followUp: { update: mockFollowUpUpdate },
      });
    });
  });

  it("counts assigned and skipped follow-ups", async () => {
    mockFollowUpFindFirst
      .mockResolvedValueOnce({
        id: "follow-1",
        assignedStaffId: "staff-1",
        status: "OPEN",
        visit: { id: "visit-1", staffId: "staff-1", customerName: "Asha" },
        fieldSale: null,
      })
      .mockResolvedValueOnce({
        id: "follow-2",
        assignedStaffId: "staff-2",
        status: "OPEN",
        visit: { id: "visit-2", staffId: "staff-2", customerName: "Riya" },
        fieldSale: null,
      });

    const result = await bulkAssignFollowUps({
      storeId: "store-1",
      targetStaffId: "staff-2",
      followUpIds: ["follow-1", "follow-2"],
    });

    expect(result).toEqual({ assigned: 1, skipped: 1 });
    expect(mockFollowUpUpdate).toHaveBeenCalledTimes(1);
  });

  it("rethrows non-SAME_STAFF errors", async () => {
    mockFollowUpFindFirst.mockResolvedValueOnce(null);

    await expect(
      bulkAssignFollowUps({
        storeId: "store-1",
        targetStaffId: "staff-2",
        followUpIds: ["missing"],
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
