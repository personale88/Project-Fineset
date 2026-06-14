import { describe, expect, it } from "vitest";
import { followUpQuerySchema, updateFollowUpSchema } from "@/lib/validations/follow-ups.schema";

describe("followUpQuerySchema", () => {
  it("parses overdue flag", () => {
    expect(followUpQuerySchema.parse({ overdue: "true" })).toEqual({
      overdue: true,
    });
  });

  it("accepts status and overdue together", () => {
    expect(
      followUpQuerySchema.parse({ status: "CLOSED", overdue: "true" }),
    ).toEqual({
      status: "CLOSED",
      overdue: true,
    });
  });
});

describe("updateFollowUpSchema", () => {
  it("requires valid status when provided", () => {
    expect(updateFollowUpSchema.parse({ status: "OPEN" })).toEqual({
      status: "OPEN",
    });
  });

  it("rejects invalid status", () => {
    expect(() => updateFollowUpSchema.parse({ status: "INVALID" })).toThrow();
  });
});
