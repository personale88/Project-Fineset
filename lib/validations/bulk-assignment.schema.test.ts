import { describe, expect, it } from "vitest";
import { bulkAssignFollowUpsSchema } from "@/lib/validations/bulk-assignment.schema";

describe("bulkAssignFollowUpsSchema", () => {
  it("accepts valid bulk assign payload", () => {
    const parsed = bulkAssignFollowUpsSchema.parse({
      targetStaffId: "clx123456789012345678901234",
      followUpIds: ["clx123456789012345678901235"],
    });
    expect(parsed.followUpIds).toHaveLength(1);
  });

  it("rejects empty followUpIds", () => {
    expect(() =>
      bulkAssignFollowUpsSchema.parse({
        targetStaffId: "clx123456789012345678901234",
        followUpIds: [],
      }),
    ).toThrow();
  });

  it("rejects more than 50 follow-ups", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `clx${String(i).padStart(21, "0")}`);
    expect(() =>
      bulkAssignFollowUpsSchema.parse({
        targetStaffId: "clx123456789012345678901234",
        followUpIds: ids,
      }),
    ).toThrow();
  });

  it("rejects invalid cuid targetStaffId", () => {
    expect(() =>
      bulkAssignFollowUpsSchema.parse({
        targetStaffId: "not-a-cuid",
        followUpIds: ["clx123456789012345678901235"],
      }),
    ).toThrow();
  });
});
