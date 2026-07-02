import { describe, expect, it } from "vitest";
import {
  AUTOMATION_CENTER_BODY_CLASS,
  AUTOMATION_CENTER_CONTENT_CARD_CLASS,
  AUTOMATION_CENTER_CONTENT_SCROLL_CLASS,
  AUTOMATION_CENTER_INTRO_CLASS,
  AUTOMATION_CENTER_NAV_CLASS,
  AUTOMATION_CENTER_ROOT_CLASS,
  AUTOMATION_MOBILE_ACTION_ROW_CLASS,
  AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS,
  AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS,
} from "@/lib/automation/automation-center-layout";

describe("automation-center-layout", () => {
  it("keeps the root shell constrained on narrow viewports", () => {
    expect(AUTOMATION_CENTER_ROOT_CLASS).toContain("min-h-0");
    expect(AUTOMATION_CENTER_ROOT_CLASS).toContain("flex-1");
    expect(AUTOMATION_CENTER_ROOT_CLASS).toContain("min-w-0");
    expect(AUTOMATION_CENTER_ROOT_CLASS).toContain("overflow-x-hidden");
    expect(AUTOMATION_CENTER_ROOT_CLASS).toContain("w-full");
  });

  it("keeps body and content card flex children from expanding horizontally", () => {
    expect(AUTOMATION_CENTER_BODY_CLASS).toContain("min-w-0");
    expect(AUTOMATION_CENTER_BODY_CLASS).toContain("w-full");
    expect(AUTOMATION_CENTER_CONTENT_CARD_CLASS).toContain("min-h-0");
    expect(AUTOMATION_CENTER_CONTENT_CARD_CLASS).toContain("min-w-0");
    expect(AUTOMATION_CENTER_CONTENT_CARD_CLASS).toContain("overflow-hidden");
  });

  it("scrolls long config forms inside the content card", () => {
    expect(AUTOMATION_CENTER_CONTENT_SCROLL_CLASS).toContain("overflow-y-auto");
    expect(AUTOMATION_CENTER_CONTENT_SCROLL_CLASS).toContain("min-h-0");
    expect(AUTOMATION_CENTER_CONTENT_SCROLL_CLASS).toContain("flex-1");
  });

  it("full-bleeds admin nav on mobile while resetting on desktop", () => {
    expect(AUTOMATION_CENTER_NAV_CLASS).toContain("-mx-page-x");
    expect(AUTOMATION_CENTER_NAV_CLASS).toContain("lg:mx-0");
  });

  it("stacks mobile action rows and full-width buttons before sm breakpoint", () => {
    expect(AUTOMATION_MOBILE_ACTION_ROW_CLASS).toContain("flex-col");
    expect(AUTOMATION_MOBILE_ACTION_ROW_CLASS).toContain("sm:flex-row");
    expect(AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS).toContain("w-full");
    expect(AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS).toContain("sm:w-auto");
  });

  it("keeps scope pills horizontally scrollable without forcing page overflow", () => {
    expect(AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS).toContain("overflow-x-auto");
    expect(AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS).toContain("min-w-0");
    expect(AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS).toContain("max-w-full");
    expect(AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS).toContain("touch-pan-x");
  });

  it("constrains page intro width", () => {
    expect(AUTOMATION_CENTER_INTRO_CLASS).toBe("min-w-0");
  });
});
