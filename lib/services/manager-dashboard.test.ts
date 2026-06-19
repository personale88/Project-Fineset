import { beforeEach, describe, expect, it, vi } from "vitest";
import { getManagerAssignmentSummary } from "@/lib/services/manager-dashboard";

const mockFollowUpCount = vi.fn();
const mockFollowUpFindMany = vi.fn();
const mockStaffCount = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    followUp: {
      count: (...args: unknown[]) => mockFollowUpCount(...args),
      findMany: (...args: unknown[]) => mockFollowUpFindMany(...args),
    },
    staff: {
      count: (...args: unknown[]) => mockStaffCount(...args),
    },
  },
}));

describe("getManagerAssignmentSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFollowUpCount.mockResolvedValue(3);
    mockStaffCount.mockResolvedValue(4);
    mockFollowUpFindMany.mockResolvedValue([
      {
        assignedStaffId: "staff-a",
        visit: { staffId: "staff-a", customerId: "cust-1" },
        fieldSale: null,
      },
      {
        assignedStaffId: "staff-b",
        visit: { staffId: "staff-a", customerId: "cust-2" },
        fieldSale: null,
      },
      {
        assignedStaffId: "staff-c",
        visit: null,
        fieldSale: { staffId: "staff-c", customerId: "cust-1" },
      },
    ]);
  });

  it("counts distinct customers, open follow-ups, mismatches, and active staff", async () => {
    const summary = await getManagerAssignmentSummary("store-1");

    expect(summary.openFollowUps).toBe(3);
    expect(summary.customersWithOpenWork).toBe(2);
    expect(summary.mismatchedAssignments).toBe(1);
    expect(summary.activeStaff).toBe(4);
  });

  it("returns zero mismatches when owners match assignees", async () => {
    mockFollowUpFindMany.mockResolvedValue([
      {
        assignedStaffId: "staff-a",
        visit: { staffId: "staff-a", customerId: "cust-1" },
        fieldSale: null,
      },
    ]);

    const summary = await getManagerAssignmentSummary("store-1");
    expect(summary.mismatchedAssignments).toBe(0);
  });
});
