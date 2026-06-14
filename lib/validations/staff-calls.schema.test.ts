import { describe, expect, it } from "vitest";
import { manualStaffCallSchema } from "@/lib/validations/staff-calls.schema";

describe("manualStaffCallSchema", () => {
  it("accepts a valid manual call payload", () => {
    const parsed = manualStaffCallSchema.safeParse({
      customerName: "Priya Sharma",
      customerPhone: "9876543210",
      customerType: "NEW",
      answered: "ANSWERED",
      feedback: "Interested in GHS",
      scheduleFollowUp: false,
    });

    expect(parsed.success).toBe(true);
  });

  it("requires feedback when call is answered", () => {
    const parsed = manualStaffCallSchema.safeParse({
      customerName: "Priya Sharma",
      customerPhone: "9876543210",
      answered: "ANSWERED",
      scheduleFollowUp: false,
    });

    expect(parsed.success).toBe(false);
  });

  it("requires follow-up date when scheduling after an answered call", () => {
    const parsed = manualStaffCallSchema.safeParse({
      customerName: "Priya Sharma",
      customerPhone: "9876543210",
      answered: "ANSWERED",
      scheduleFollowUp: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid phone numbers", () => {
    const parsed = manualStaffCallSchema.safeParse({
      customerName: "Priya Sharma",
      customerPhone: "12345",
      answered: "NOT_ANSWERED",
    });

    expect(parsed.success).toBe(false);
  });
});
