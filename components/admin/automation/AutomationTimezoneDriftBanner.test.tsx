// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { content } from "@/content/en";
import { AutomationTimezoneDriftBanner } from "@/components/admin/automation/AutomationTimezoneDriftBanner";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AutomationTimezoneDriftBanner", () => {
  it("renders drift guidance and a sync action for editable users", async () => {
    const user = userEvent.setup();
    const onSync = vi.fn();

    render(
      <AutomationTimezoneDriftBanner
        message="Automation timezone (Asia/Kolkata) differs from Master Settings (America/New_York)."
        syncLabel={content.admin.automation.fields.timezoneDriftSync}
        onSync={onSync}
      />,
    );

    expect(screen.getByTestId("automation-timezone-drift-banner")).toBeInTheDocument();
    await user.click(screen.getByTestId("automation-timezone-sync"));
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it("hides the sync action for read-only users", () => {
    render(
      <AutomationTimezoneDriftBanner
        message="Automation timezone (Asia/Kolkata) differs from Master Settings (America/New_York)."
        syncLabel={content.admin.automation.fields.timezoneDriftSync}
        onSync={() => undefined}
        canEdit={false}
      />,
    );

    expect(screen.getByTestId("automation-timezone-drift-banner")).toBeInTheDocument();
    expect(screen.queryByTestId("automation-timezone-sync")).not.toBeInTheDocument();
  });
});
