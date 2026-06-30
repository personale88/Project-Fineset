import { describe, expect, it } from "vitest";
import { ADMIN_MOBILE_BOTTOM_PRIMARY_HREFS } from "@/lib/admin/admin-dashboard-nav-config";

describe("admin-dashboard-nav-config mobile split", () => {
  it("promotes Automation to the primary bottom bar", () => {
    expect(ADMIN_MOBILE_BOTTOM_PRIMARY_HREFS).toContain("/admin/dashboard/automation");
  });

  it("moves Billing to the More overflow menu", () => {
    expect(ADMIN_MOBILE_BOTTOM_PRIMARY_HREFS).not.toContain("/admin/dashboard/billing");
  });
});
