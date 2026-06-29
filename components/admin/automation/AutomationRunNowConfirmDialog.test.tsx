// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { content } from "@/content/en";
import { AutomationRunNowConfirmDialog } from "@/components/admin/automation/AutomationRunNowConfirmDialog";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";

afterEach(() => {
  cleanup();
});

describe("AutomationRunNowConfirmDialog", () => {
  const copy = content.admin.automation.runNowConfirm;

  it("lists configured outbound actions and audit guidance", () => {
    render(
      <AutomationRunNowConfirmDialog
        open
        onOpenChange={vi.fn()}
        config={DEFAULT_PLATFORM_AUTOMATION_CONFIG}
        copy={copy}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-run-now-dialog")).toBeInTheDocument();
    expect(screen.getByText(copy.title)).toBeInTheDocument();
    expect(screen.getByText(copy.auditHint)).toBeInTheDocument();
    expect(screen.getByTestId("automation-run-now-action-list")).toHaveTextContent(
      copy.actions.paymentReminderEmails,
    );
    expect(screen.getByTestId("automation-run-now-action-list")).toHaveTextContent(
      copy.actions.whatsAppReminders,
    );
  });

  it("shows dry run guidance when dry run mode is enabled", () => {
    render(
      <AutomationRunNowConfirmDialog
        open
        onOpenChange={vi.fn()}
        config={{
          ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
          global: {
            ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
            dryRunMode: true,
          },
        }}
        copy={copy}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByTestId("automation-run-now-dry-run-notice")).toHaveTextContent(
      copy.dryRunNotice,
    );
  });

  it("calls onConfirm when the user confirms the live run", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <AutomationRunNowConfirmDialog
        open
        onOpenChange={vi.fn()}
        config={DEFAULT_PLATFORM_AUTOMATION_CONFIG}
        copy={copy}
        onConfirm={onConfirm}
      />,
    );

    await user.click(screen.getByTestId("automation-run-now-confirm"));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes without confirming when cancel is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <AutomationRunNowConfirmDialog
        open
        onOpenChange={onOpenChange}
        config={DEFAULT_PLATFORM_AUTOMATION_CONFIG}
        copy={copy}
        onConfirm={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("automation-run-now-cancel"));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
