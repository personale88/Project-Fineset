// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { content } from "@/content/en";
import { PortalShell } from "@/components/layout/PortalShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
}));

vi.mock("@/hooks/usePortalSignOut", () => ({
  usePortalSignOut: () => ({
    signOut: vi.fn(),
    isSigningOut: false,
  }),
}));

vi.mock("@/components/pwa/OfflineQueueBanner", () => ({
  OfflineQueueBanner: () => null,
}));

describe("PortalShell header", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows My Store as the brand title with portal type as supporting text", () => {
    render(
      <PortalShell
        title={content.common.portalBrandTitle}
        portalType={content.admin.shell.title}
        signOutLabel={content.common.signOut}
      >
        <div>Page content</div>
      </PortalShell>,
    );

    expect(screen.getByTestId("portal-brand-title")).toHaveTextContent("My Store");
    expect(screen.getByTestId("portal-type-label")).toHaveTextContent("Master Admin");
  });

  it("renders each portal type label when provided", () => {
    const portalTypes = [
      content.staff.shell.title,
      content.store.managerShell.title,
      content.store.ownerShell.title,
    ] as const;

    for (const portalType of portalTypes) {
      cleanup();
      render(
        <PortalShell
          title={content.common.portalBrandTitle}
          portalType={portalType}
          signOutLabel={content.common.signOut}
        >
          <div>Page content</div>
        </PortalShell>,
      );

      expect(screen.getByTestId("portal-brand-title")).toHaveTextContent("My Store");
      expect(screen.getByTestId("portal-type-label")).toHaveTextContent(portalType);
    }
  });

  it("omits portal type label when portalType is not provided", () => {
    render(
      <PortalShell title="My Store" signOutLabel={content.common.signOut}>
        <div>Page content</div>
      </PortalShell>,
    );

    expect(screen.getByTestId("portal-brand-title")).toHaveTextContent("My Store");
    expect(screen.queryByTestId("portal-type-label")).not.toBeInTheDocument();
  });
});
