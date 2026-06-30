import { describe, expect, it } from "vitest";
import {
  PORTAL_ADMIN_CONTENT_GAP_PX,
  PORTAL_CHILD_SIDE_NAV_WIDTH_PX,
  PORTAL_SIDE_NAV_WIDTH_PX,
  portalAdminContentWithChildPanelClassName,
  portalChildSideNavOffsetClassName,
  portalSideNavOffsetClassName,
  portalSideNavWidthClassName,
} from "@/components/layout/portal-side-nav-styles";

describe("portal-side-nav-styles", () => {
  it("uses an 80px rail width", () => {
    expect(PORTAL_SIDE_NAV_WIDTH_PX).toBe(80);
    expect(portalSideNavWidthClassName).toBe("w-20");
    expect(portalSideNavOffsetClassName).toBe("lg:pl-20");
  });

  it("uses a 288px child panel width", () => {
    expect(PORTAL_CHILD_SIDE_NAV_WIDTH_PX).toBe(288);
    expect(portalChildSideNavOffsetClassName).toBe(portalAdminContentWithChildPanelClassName);
  });

  it("uses a 40px gap between left panels and content", () => {
    expect(PORTAL_ADMIN_CONTENT_GAP_PX).toBe(40);
    expect(portalAdminContentWithChildPanelClassName).toContain("2.5rem");
  });
});
