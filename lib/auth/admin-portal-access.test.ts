import { describe, expect, it } from "vitest";
import {
  canEditAdminPortal,
  canManageAutomationSettings,
} from "@/lib/auth/admin-portal-access";

describe("canEditAdminPortal", () => {
  it("allows master admins to edit", () => {
    expect(canEditAdminPortal("MASTER_ADMIN")).toBe(true);
  });

  it("treats platform admins as read-only", () => {
    expect(canEditAdminPortal("PLATFORM_ADMIN")).toBe(false);
  });
});

describe("canManageAutomationSettings", () => {
  it("allows master admins to manage automation settings", () => {
    expect(canManageAutomationSettings("MASTER_ADMIN")).toBe(true);
  });

  it("treats platform admins as read-only for automation settings", () => {
    expect(canManageAutomationSettings("PLATFORM_ADMIN")).toBe(false);
  });
});
