import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnerDashboardOverview } from "@/lib/services/owner-dashboard";

const mockGetManagerStaffActivity = vi.fn();
const mockStoreFindMany = vi.fn();

vi.mock("@/lib/services/manager-dashboard", () => ({
  getManagerStaffActivity: (...args: unknown[]) =>
    mockGetManagerStaffActivity(...args),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    store: {
      findMany: (...args: unknown[]) => mockStoreFindMany(...args),
    },
  },
}));

describe("getOwnerDashboardOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreFindMany.mockResolvedValue([
      { id: "store-a", name: "Store Alpha" },
      { id: "store-b", name: "Store Beta" },
    ]);
    mockGetManagerStaffActivity.mockImplementation(async (storeId: string) => [
      {
        staffId: `${storeId}-staff-1`,
        staffName: storeId === "store-a" ? "Alice" : "Bob",
        role: "STAFF",
        isActive: true,
        monthlyVisits: 5,
        conversionRate: 20,
        openFollowUps: 1,
        pendingWork: 2,
        overdueTasks: 1,
        dueTodayTasks: 0,
      },
    ]);
  });

  it("aggregates staff activity across stores", async () => {
    const overview = await getOwnerDashboardOverview(["store-a", "store-b"]);

    expect(overview.staffActivity).toHaveLength(2);
    expect(overview.staffActivity[0]?.storeName).toBe("Store Alpha");
  });

  it("returns empty overview when no stores are provided", async () => {
    const overview = await getOwnerDashboardOverview([]);

    expect(overview.staffActivity).toEqual([]);
  });
});
