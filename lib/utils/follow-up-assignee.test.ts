import { describe, expect, it } from "vitest";
import { resolveFollowUpAssignee } from "@/lib/utils/follow-up-assignee";

describe("resolveFollowUpAssignee", () => {
  it("assigns to caller on personal scope", () => {
    expect(
      resolveFollowUpAssignee({
        storeScope: false,
        recordOwnerStaffId: "owner",
        callerStaffId: "caller",
      }),
    ).toBe("caller");
  });

  it("keeps existing assignee on team scope", () => {
    expect(
      resolveFollowUpAssignee({
        storeScope: true,
        recordOwnerStaffId: "owner",
        callerStaffId: "manager",
        existingAssignedStaffId: "assigned",
      }),
    ).toBe("assigned");
  });

  it("assigns to record owner on team scope when unassigned", () => {
    expect(
      resolveFollowUpAssignee({
        storeScope: true,
        recordOwnerStaffId: "owner",
        callerStaffId: "manager",
      }),
    ).toBe("owner");
  });
});
