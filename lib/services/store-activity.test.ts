import { describe, expect, it, vi, beforeEach } from "vitest";
import { listStoreActivity } from "@/lib/services/store-activity";

const mockCorrectionFindMany = vi.fn();
const mockAuditFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    correctionRequest: {
      findMany: (...args: unknown[]) => mockCorrectionFindMany(...args),
    },
    authAuditLog: {
      findMany: (...args: unknown[]) => mockAuditFindMany(...args),
    },
  },
}));

describe("listStoreActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCorrectionFindMany.mockResolvedValue([
      {
        id: "corr-1",
        status: "OPEN",
        createdAt: new Date("2026-06-20T10:00:00Z"),
        resolvedAt: null,
        staff: { name: "Alice" },
      },
    ]);
    mockAuditFindMany.mockResolvedValue([
      {
        id: "audit-1",
        event: "VISIT_IMPORT",
        email: "owner@test.local",
        metadata: { storeId: "store-1" },
        createdAt: new Date("2026-06-19T10:00:00Z"),
      },
    ]);
  });

  it("merges correction and audit events newest first", async () => {
    const rows = await listStoreActivity("store-1", 10);

    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe("correction-corr-1");
    expect(rows[1]?.event).toBe("VISIT_IMPORT");
  });
});
