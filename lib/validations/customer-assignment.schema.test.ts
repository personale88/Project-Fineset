import { describe, expect, it } from "vitest";
import { assignCustomerSchema } from "@/lib/validations/customer-assignment.schema";

describe("assignCustomerSchema", () => {
  it("accepts visit assignment", () => {
    const parsed = assignCustomerSchema.safeParse({
      targetStaffId: "clxyz123456789012345678901",
      visitId: "clabc123456789012345678901",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects when no target record is provided", () => {
    const parsed = assignCustomerSchema.safeParse({
      targetStaffId: "clxyz123456789012345678901",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects when multiple targets are provided", () => {
    const parsed = assignCustomerSchema.safeParse({
      targetStaffId: "clxyz123456789012345678901",
      visitId: "clabc123456789012345678901",
      fieldSaleId: "cldef123456789012345678901",
    });
    expect(parsed.success).toBe(false);
  });
});
