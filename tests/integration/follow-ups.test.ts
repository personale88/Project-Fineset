import { describe, expect, it, vi } from "vitest";
import { listFollowUps } from "@/lib/services/follow-ups";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    followUp: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        if (where.status === "CLOSED" && where.followUpDate) {
          return [];
        }
        return [{ id: "f1" }];
      }),
    },
    staff: {
      findMany: vi.fn(async () => []),
    },
  },
}));

describe("listFollowUps filter combinations", () => {
  it("combines status and overdue without overwriting status", async () => {
    const { prisma } = await import("@/lib/db/prisma");
    await listFollowUps({
      storeId: "store-1",
      status: "CLOSED",
      overdue: true,
    });

    expect(prisma.followUp.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "CLOSED",
          followUpDate: expect.any(Object),
        }),
      }),
    );
  });
});
