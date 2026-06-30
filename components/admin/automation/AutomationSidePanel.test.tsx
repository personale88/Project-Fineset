// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { content } from "@/content/en";
import {
  AUTOMATION_SCOPE_PANEL_ID,
  automationScopeTabId,
} from "@/lib/automation/scope-tabs-a11y";
import { AutomationSidePanel } from "@/components/admin/automation/AutomationSidePanel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AutomationSidePanel read-only mode", () => {
  it("shows the read-only hint in the mobile scope panel for platform admins", () => {
    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="overview"
        onChange={() => undefined}
        canEdit={false}
        readOnlyHint={content.admin.automation.readOnlyHint}
      />,
    );

    const mobilePanel = screen.getByTestId("automation-scope-panel-mobile");
    expect(mobilePanel).toBeInTheDocument();
    expect(within(mobilePanel).getByTestId("automation-scope-read-only-hint")).toHaveTextContent(
      content.admin.automation.readOnlyHint,
    );
  });

  it("keeps scope tabs interactive while read-only", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="overview"
        onChange={onChange}
        canEdit={false}
        readOnlyHint={content.admin.automation.readOnlyHint}
      />,
    );

    await user.click(screen.getByRole("tab", { name: content.admin.automation.scope.billingCycle }));
    expect(onChange).toHaveBeenCalledWith("billingCycle");
  });

  it("hides the read-only hint for master admins", () => {
    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="overview"
        onChange={() => undefined}
        canEdit
      />,
    );

    expect(screen.queryByTestId("automation-scope-read-only-hint")).not.toBeInTheDocument();
  });

  it("renders a touch-friendly horizontally scrollable mobile scope row", () => {
    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="overview"
        onChange={() => undefined}
      />,
    );

    const scroll = screen.getByTestId("automation-scope-scroll");
    expect(scroll).toHaveClass("overflow-x-auto");
    expect(scroll).toHaveClass("touch-pan-x");
    expect(scroll).toHaveClass("flex-nowrap");
    expect(scroll).toHaveClass("min-w-0");
    expect(scroll).toHaveClass("max-w-full");
    expect(within(scroll).getAllByRole("tab")).toHaveLength(9);
  });
});

describe("AutomationSidePanel ARIA tab semantics", () => {
  it("links each scope tab to the shared tabpanel with roving tabindex", () => {
    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="billingCycle"
        onChange={() => undefined}
        docked={false}
      />,
    );

    const mobileScroll = screen.getByTestId("automation-scope-scroll");
    const mobileTabs = within(mobileScroll).getAllByRole("tab");
    const activeMobileTab = within(mobileScroll).getByRole("tab", {
      name: content.admin.automation.scope.billingCycle,
    });
    const inactiveMobileTab = within(mobileScroll).getByRole("tab", {
      name: content.admin.automation.scope.overview,
    });

    expect(mobileScroll).toHaveAttribute("aria-orientation", "horizontal");
    expect(activeMobileTab).toHaveAttribute("id", automationScopeTabId("billingCycle", "mobile"));
    expect(activeMobileTab).toHaveAttribute("aria-controls", AUTOMATION_SCOPE_PANEL_ID);
    expect(activeMobileTab).toHaveAttribute("aria-selected", "true");
    expect(activeMobileTab).toHaveAttribute("tabindex", "0");
    expect(inactiveMobileTab).toHaveAttribute("aria-selected", "false");
    expect(inactiveMobileTab).toHaveAttribute("tabindex", "-1");
    expect(mobileTabs.every((tab) => tab.getAttribute("aria-controls") === AUTOMATION_SCOPE_PANEL_ID)).toBe(
      true,
    );

    const desktopPanel = screen.getByTestId("automation-scope-panel-desktop");
    const desktopTablist = within(desktopPanel).getByRole("tablist");
    const activeDesktopTab = within(desktopTablist).getByRole("tab", {
      name: new RegExp(content.admin.automation.scope.billingCycle, "i"),
    });

    expect(desktopTablist).toHaveAttribute("aria-orientation", "vertical");
    expect(activeDesktopTab).toHaveAttribute("id", automationScopeTabId("billingCycle", "desktop"));
    expect(activeDesktopTab).toHaveAttribute("aria-controls", AUTOMATION_SCOPE_PANEL_ID);
    expect(activeDesktopTab).toHaveAttribute("tabindex", "0");
  });

  it("moves selection with arrow keys on the mobile tablist", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="overview"
        onChange={onChange}
      />,
    );

    const mobileScroll = screen.getByTestId("automation-scope-scroll");
    const overviewTab = within(mobileScroll).getByRole("tab", {
      name: content.admin.automation.scope.overview,
    });
    overviewTab.focus();

    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("billingCycle");
  });

  it("moves selection with arrow keys on the desktop tablist", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="invoices"
        onChange={onChange}
        docked={false}
      />,
    );

    const desktopPanel = screen.getByTestId("automation-scope-panel-desktop");
    const invoicesTab = within(desktopPanel).getByRole("tab", {
      name: new RegExp(content.admin.automation.scope.invoices, "i"),
    });
    invoicesTab.focus();

    await user.keyboard("{ArrowDown}");
    expect(onChange).toHaveBeenCalledWith("paymentReminders");

    await user.keyboard("{ArrowUp}");
    expect(onChange).toHaveBeenCalledWith("billingCycle");
  });

  it("jumps to the first and last tabs with Home and End", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <AutomationSidePanel
        copy={content.admin.automation}
        value="whatsApp"
        onChange={onChange}
      />,
    );

    const mobileScroll = screen.getByTestId("automation-scope-scroll");
    within(mobileScroll)
      .getByRole("tab", { name: content.admin.automation.scope.whatsApp })
      .focus();

    await user.keyboard("{Home}");
    expect(onChange).toHaveBeenCalledWith("overview");

    await user.keyboard("{End}");
    expect(onChange).toHaveBeenCalledWith("history");
  });
});
