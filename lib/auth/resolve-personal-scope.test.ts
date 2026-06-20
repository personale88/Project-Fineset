import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveStaffCallsStoreScope, resolvePersonalStaffId, isUnlinkedManagerPersonalScope } from "@/lib/auth/resolve-personal-scope";
import type { StoreSession } from "@/types";

vi.mock("@/lib/auth/resolve-staff", () => ({
  requirePortalActorContext: vi.fn(),
}));

import { requirePortalActorContext } from "@/lib/auth/resolve-staff";

const managerSession: StoreSession = {
  role: "STORE_MANAGER",
  userId: "mgr-1",
  email: "mgr@test.local",
  storeId: "store-1",
  storeName: "Test Store",
};

describe("resolveStaffCallsStoreScope", () => {
  it("uses store scope for store manager by default", () => {
    expect(resolveStaffCallsStoreScope("STORE_MANAGER", false)).toBe(true);
    expect(resolveStaffCallsStoreScope("STORE_MANAGER", undefined)).toBe(true);
  });

  it("uses personal scope when personalScope is true", () => {
    expect(resolveStaffCallsStoreScope("STORE_MANAGER", true)).toBe(false);
  });

  it("never uses store scope for staff", () => {
    expect(resolveStaffCallsStoreScope("STAFF", false)).toBe(false);
    expect(resolveStaffCallsStoreScope("STAFF", true)).toBe(false);
  });

  it("uses store scope for business owner and master admin", () => {
    expect(resolveStaffCallsStoreScope("BUSINESS_OWNER", false)).toBe(true);
    expect(resolveStaffCallsStoreScope("MASTER_ADMIN", false)).toBe(true);
  });
});

describe("resolvePersonalStaffId", () => {
  beforeEach(() => {
    vi.mocked(requirePortalActorContext).mockReset();
  });

  it("returns undefined when personalScope is false", async () => {
    await expect(resolvePersonalStaffId(managerSession, false)).resolves.toBeUndefined();
    expect(requirePortalActorContext).not.toHaveBeenCalled();
  });

  it("returns undefined for non-manager roles", async () => {
    await expect(
      resolvePersonalStaffId(
        { role: "STAFF", userId: "s", email: "s@test.local", staffId: "st", storeId: "store-1", name: "S", employeeId: "E" },
        true,
      ),
    ).resolves.toBeUndefined();
  });

  it("returns manager staff id when actor is linked", async () => {
    vi.mocked(requirePortalActorContext).mockResolvedValue({
      staffId: "manager-staff-1",
      storeId: "store-1",
    });
    await expect(resolvePersonalStaffId(managerSession, true)).resolves.toBe("manager-staff-1");
  });

  it("returns undefined when manager has no linked staff", async () => {
    vi.mocked(requirePortalActorContext).mockResolvedValue(null);
    await expect(resolvePersonalStaffId(managerSession, true)).resolves.toBeUndefined();
  });
});

describe("isUnlinkedManagerPersonalScope", () => {
  it("is true for manager personal scope without linked staff", () => {
    expect(isUnlinkedManagerPersonalScope(managerSession, true, undefined)).toBe(true);
  });

  it("is false when staff is linked or scope is not personal", () => {
    expect(isUnlinkedManagerPersonalScope(managerSession, true, "staff-1")).toBe(false);
    expect(isUnlinkedManagerPersonalScope(managerSession, false, undefined)).toBe(false);
  });
});
