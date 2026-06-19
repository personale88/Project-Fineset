import { describe, expect, it } from "vitest";
import { followUpQuerySchema, updateFollowUpSchema } from "@/lib/validations/follow-ups.schema";

describe("followUpQuerySchema", () => {
  it("parses overdue flag", () => {
    expect(followUpQuerySchema.parse({ overdue: "true" })).toEqual({
      overdue: true,
      dueToday: false,
      personalScope: false,
      mismatched: false,
    });
  });

  it("parses dueToday and filter", () => {
    expect(followUpQuerySchema.parse({ dueToday: "true" })).toEqual({
      dueToday: true,
      overdue: false,
      personalScope: false,
      mismatched: false,
    });
    expect(followUpQuerySchema.parse({ filter: "open" })).toEqual({
      filter: "open",
      overdue: false,
      dueToday: false,
      personalScope: false,
      mismatched: false,
    });
  });
});

describe("updateFollowUpSchema", () => {
  it("accepts open and close actions", () => {
    expect(updateFollowUpSchema.parse({ action: "open" })).toEqual({
      action: "open",
    });
    expect(updateFollowUpSchema.parse({ action: "close" })).toEqual({
      action: "close",
    });
  });

  it("requires followUpDate when scheduling", () => {
    expect(() => updateFollowUpSchema.parse({ action: "schedule" })).toThrow();
  });

  it("rejects past schedule dates", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    expect(() =>
      updateFollowUpSchema.parse({
        action: "schedule",
        followUpDate: yesterday.toISOString(),
      }),
    ).toThrow();
  });

  it("accepts future schedule dates", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const parsed = updateFollowUpSchema.parse({
      action: "schedule",
      followUpDate: tomorrow.toISOString(),
    });

    expect(parsed.action).toBe("schedule");
    expect(parsed.followUpDate).toBeInstanceOf(Date);
  });
});
