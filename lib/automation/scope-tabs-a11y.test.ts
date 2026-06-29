// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  AUTOMATION_SCOPE_PANEL_ID,
  automationScopeTabId,
  focusAutomationScopeTab,
  handleAutomationScopeTabListKeyDown,
} from "@/lib/automation/scope-tabs-a11y";
import type { AutomationScope } from "@/components/admin/automation/AutomationSidePanel";

const scopes: AutomationScope[] = [
  "overview",
  "billingCycle",
  "invoices",
  "paymentReminders",
  "followUps",
  "expiryRenewal",
  "monthlyReports",
  "whatsApp",
  "history",
];

function createKeyEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLElement>;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("automation scope tab a11y helpers", () => {
  it("uses stable tab and panel ids", () => {
    expect(AUTOMATION_SCOPE_PANEL_ID).toBe("automation-scope-panel");
    expect(automationScopeTabId("billingCycle", "mobile")).toBe(
      "automation-scope-tab-mobile-billingCycle",
    );
    expect(automationScopeTabId("history", "desktop")).toBe(
      "automation-scope-tab-desktop-history",
    );
  });

  it("focuses the requested scope tab", () => {
    const button = document.createElement("button");
    button.id = automationScopeTabId("invoices", "desktop");
    document.body.append(button);
    const focusSpy = vi.spyOn(button, "focus");

    focusAutomationScopeTab("invoices", "desktop");

    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("moves to the next tab on ArrowRight in a horizontal tablist", () => {
    const onChange = vi.fn();
    const event = createKeyEvent("ArrowRight");

    handleAutomationScopeTabListKeyDown(
      event,
      scopes,
      "overview",
      "mobile",
      onChange,
      "horizontal",
    );

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith("billingCycle");
  });

  it("wraps to the first tab from the last tab on ArrowRight", () => {
    const onChange = vi.fn();
    const event = createKeyEvent("ArrowRight");

    handleAutomationScopeTabListKeyDown(
      event,
      scopes,
      "history",
      "mobile",
      onChange,
      "horizontal",
    );

    expect(onChange).toHaveBeenCalledWith("overview");
  });

  it("moves to the previous tab on ArrowUp in a vertical tablist", () => {
    const onChange = vi.fn();
    const event = createKeyEvent("ArrowUp");

    handleAutomationScopeTabListKeyDown(
      event,
      scopes,
      "invoices",
      "desktop",
      onChange,
      "vertical",
    );

    expect(onChange).toHaveBeenCalledWith("billingCycle");
  });

  it("jumps to the first and last tabs with Home and End", () => {
    const onChange = vi.fn();

    handleAutomationScopeTabListKeyDown(
      createKeyEvent("Home"),
      scopes,
      "whatsApp",
      "desktop",
      onChange,
      "vertical",
    );
    expect(onChange).toHaveBeenCalledWith("overview");

    handleAutomationScopeTabListKeyDown(
      createKeyEvent("End"),
      scopes,
      "overview",
      "desktop",
      onChange,
      "vertical",
    );
    expect(onChange).toHaveBeenCalledWith("history");
  });
});
