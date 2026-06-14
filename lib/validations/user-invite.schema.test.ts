import { describe, expect, it } from "vitest";
import { inviteUserSchema } from "@/lib/validations/user-invite.schema";

describe("inviteUserSchema", () => {
  it("requires employeeId for STAFF role", () => {
    const result = inviteUserSchema.safeParse({
      name: "Alex",
      email: "alex@test.local",
      role: "STAFF",
      storeId: "clxxxxxxxxxxxxxxxxxx",
    });
    expect(result.success).toBe(false);
  });

  it("accepts BUSINESS_OWNER with storeId", () => {
    const result = inviteUserSchema.safeParse({
      name: "Owner",
      email: "owner@test.local",
      role: "BUSINESS_OWNER",
      storeId: "clxxxxxxxxxxxxxxxxxx",
      password: "ValidPass1!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects storeId on MASTER_ADMIN", () => {
    const result = inviteUserSchema.safeParse({
      name: "Admin",
      email: "admin@test.local",
      role: "MASTER_ADMIN",
      storeId: "clxxxxxxxxxxxxxxxxxx",
      password: "ValidPass1!",
    });
    expect(result.success).toBe(false);
  });
});
