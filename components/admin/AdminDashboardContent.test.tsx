// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminDashboardContent } from "@/components/admin/AdminDashboardContent";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

import { usePathname } from "next/navigation";

describe("AdminDashboardContent", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    "/admin/dashboard/settings",
    "/admin/dashboard/accounts",
    "/admin/dashboard/automation",
    "/admin/dashboard/analytics",
  ])("applies child panel inset on scoped routes (%s)", (pathname) => {
    vi.mocked(usePathname).mockReturnValue(pathname);

    render(
      <AdminDashboardContent>
        <div>Scoped body</div>
      </AdminDashboardContent>,
    );

    const root = screen.getByTestId("admin-dashboard-content");
    expect(root).toHaveAttribute("data-admin-child-panel", "");
    expect(root.className).toContain("lg:pl-[calc(18rem+2.5rem)]");
  });

  it.each(["/admin/dashboard/accounts/store-1", "/admin/dashboard/stores/store-1"])(
    "does not apply child panel inset on store detail routes (%s)",
    (pathname) => {
      vi.mocked(usePathname).mockReturnValue(pathname);

      render(
        <AdminDashboardContent>
          <div>Store detail body</div>
        </AdminDashboardContent>,
      );

      const root = screen.getByTestId("admin-dashboard-content");
      expect(root).not.toHaveAttribute("data-admin-child-panel");
      expect(root.className).not.toContain("lg:pl-[calc(18rem+2.5rem)]");
    },
  );

  it.each(["/admin/dashboard", "/admin/dashboard/billing"])(
    "uses the primary nav gap on other admin routes (%s)",
    (pathname) => {
      vi.mocked(usePathname).mockReturnValue(pathname);

      render(
        <AdminDashboardContent>
          <div>Primary body</div>
        </AdminDashboardContent>,
      );

      const root = screen.getByTestId("admin-dashboard-content");
      expect(root).not.toHaveAttribute("data-admin-child-panel");
      expect(root.className).not.toContain("lg:pl-[calc(18rem+2.5rem)]");
      expect(root.className).toContain("pl-10");
    },
  );

  it("scrolls inside the content container on standard admin pages", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard/billing");

    render(
      <AdminDashboardContent>
        <div>Settings body</div>
      </AdminDashboardContent>,
    );

    expect(screen.getByTestId("admin-dashboard-content").className).toContain("overflow-y-auto");
  });

  it("scrolls store detail in the outer content container", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard/accounts/store-1");

    render(
      <AdminDashboardContent>
        <div>Store detail body</div>
      </AdminDashboardContent>,
    );

    const root = screen.getByTestId("admin-dashboard-content");
    expect(root.className).toContain("overflow-y-auto");
    expect(root.className).not.toContain("overflow-hidden");
  });

  it("keeps automation scroll internal to the page shell", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard/automation");

    render(
      <AdminDashboardContent>
        <div>Automation body</div>
      </AdminDashboardContent>,
    );

    const root = screen.getByTestId("admin-dashboard-content");
    expect(root.className).toContain("overflow-hidden");
    expect(root.className).toContain("min-h-0");
    expect(root.className).toContain("flex-1");
    expect(root.className).not.toContain("overflow-y-auto");
  });

  it.each(["/admin/dashboard/settings", "/admin/dashboard/accounts"])(
    "keeps scoped page scroll internal for %s",
    (pathname) => {
      vi.mocked(usePathname).mockReturnValue(pathname);

      render(
        <AdminDashboardContent>
          <div>Scoped body</div>
        </AdminDashboardContent>,
      );

      const root = screen.getByTestId("admin-dashboard-content");
      expect(root.className).toContain("overflow-hidden");
      expect(root.className).toContain("min-h-0");
      expect(root.className).not.toContain("overflow-y-auto");
    },
  );

  it("keeps analytics scroll internal to the page shell", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard/analytics");

    render(
      <AdminDashboardContent>
        <div>Analytics body</div>
      </AdminDashboardContent>,
    );

    const root = screen.getByTestId("admin-dashboard-content");
    expect(root.className).toContain("overflow-hidden");
    expect(root.className).toContain("overflow-x-hidden");
    expect(root.className).toContain("min-h-0");
    expect(root.className).toContain("pt-2");
    expect(root.className).toContain("lg:pt-3");
    expect(root.className).not.toContain("overflow-y-auto");
    expect(root.className).not.toContain("py-6");
  });
});
