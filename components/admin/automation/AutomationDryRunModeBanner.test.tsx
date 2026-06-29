// @vitest-environment jsdom
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { content } from "@/content/en";
import { AutomationDryRunModeBanner } from "@/components/admin/automation/AutomationDryRunModeBanner";

afterEach(() => {
  cleanup();
});

describe("AutomationDryRunModeBanner", () => {
  it("renders dry run mode guidance", () => {
    render(
      <AutomationDryRunModeBanner message={content.admin.automation.dryRunModeActiveBanner} />,
    );

    expect(screen.getByTestId("automation-dry-run-mode-banner")).toBeInTheDocument();
    expect(screen.getByTestId("automation-dry-run-mode-banner")).toHaveTextContent(
      content.admin.automation.dryRunModeActiveBanner,
    );
  });
});
