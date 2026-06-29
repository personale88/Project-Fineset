import { describe, expect, it } from "vitest";
import { content } from "@/content/en";
import type { AutomationRunLogDto, AutomationRunSummary } from "@/lib/automation/types";
import {
  formatAutomationRunErrors,
  formatAutomationRunRequestError,
  formatAutomationRunSummaryLine,
  formatAutomationRunToastDescription,
  isAutomationDryRunForced,
  resolveAutomationRunToastTitle,
} from "@/lib/automation/run-summary";
import { ApiError } from "@/types";

const sampleSummary: AutomationRunSummary = {
  invoicesSent: 2,
  invoicesSkipped: 0,
  paymentRemindersSent: 1,
  whatsAppQueued: 3,
  followUpsScheduled: 4,
  renewalRemindersSent: 5,
  expiryWarningsSent: 6,
  monthlyReportsSent: 7,
  paymentConfirmationsSent: 0,
  details: [],
};

const emptySummary: AutomationRunSummary = {
  invoicesSent: 0,
  invoicesSkipped: 0,
  paymentRemindersSent: 0,
  whatsAppQueued: 0,
  followUpsScheduled: 0,
  renewalRemindersSent: 0,
  expiryWarningsSent: 0,
  monthlyReportsSent: 0,
  paymentConfirmationsSent: 0,
  details: [],
};

function makeRun(
  overrides: Partial<AutomationRunLogDto> = {},
): Pick<AutomationRunLogDto, "status" | "summary" | "errors" | "trigger"> {
  return {
    status: "SUCCESS",
    trigger: "MANUAL",
    summary: emptySummary,
    errors: null,
    ...overrides,
  };
}

const runCopy = content.admin.automation;

describe("formatAutomationRunSummaryLine", () => {
  it("fills every placeholder in the run toast summary template", () => {
    const line = formatAutomationRunSummaryLine(
      content.admin.automation.runSummary,
      sampleSummary,
    );

    expect(line).toBe(
      "2 invoices · 1 reminders · 3 WhatsApp queued · 4 follow-ups scheduled · 5 renewal reminders · 6 expiry warnings · 7 monthly reports",
    );
    expect(line).not.toMatch(/\{/);
  });

  it("fills every placeholder in the history summary template", () => {
    const line = formatAutomationRunSummaryLine(
      content.admin.automation.history.summaryLine,
      sampleSummary,
    );

    expect(line).toBe(
      "2 invoices · 1 email reminders · 3 WhatsApp queued · 4 follow-ups · 5 renewal reminders · 6 expiry warnings · 7 monthly reports",
    );
    expect(line).not.toMatch(/\{/);
  });
});

describe("formatAutomationRunErrors", () => {
  it("joins trimmed run errors with separators", () => {
    expect(
      formatAutomationRunErrors([
        "Simulated invoice send failure",
        " Invoice number pool exhausted for today. ",
      ]),
    ).toBe(
      "Simulated invoice send failure · Invoice number pool exhausted for today.",
    );
  });

  it("returns undefined when there are no errors", () => {
    expect(formatAutomationRunErrors(null)).toBeUndefined();
    expect(formatAutomationRunErrors([])).toBeUndefined();
  });

  it("redacts business names from scoped run errors", () => {
    expect(
      formatAutomationRunErrors([
        "Jewelry Store Alpha: Simulated invoice send failure",
        "Jewelry Store Beta: Simulated invoice send failure",
      ]),
    ).toBe("Simulated invoice send failure");
  });
});

describe("formatAutomationRunToastDescription", () => {
  it("appends run errors for failed runs", () => {
    const description = formatAutomationRunToastDescription(
      content.admin.automation.runSummary,
      makeRun({
        status: "FAILED",
        summary: sampleSummary,
        errors: ["Simulated invoice send failure"],
      }),
    );

    expect(description).toContain("2 invoices · 1 reminders");
    expect(description).toContain("— Simulated invoice send failure");
  });

  it("appends run errors for partial runs", () => {
    const description = formatAutomationRunToastDescription(
      content.admin.automation.runSummary,
      makeRun({
        status: "PARTIAL",
        summary: sampleSummary,
        errors: ["Reminder skipped for missing email"],
      }),
    );

    expect(description).toContain("— Reminder skipped for missing email");
  });

  it("returns only the summary line for successful runs", () => {
    expect(
      formatAutomationRunToastDescription(
        content.admin.automation.runSummary,
        makeRun({ status: "SUCCESS", summary: sampleSummary, errors: null }),
      ),
    ).toBe(
      "2 invoices · 1 reminders · 3 WhatsApp queued · 4 follow-ups scheduled · 5 renewal reminders · 6 expiry warnings · 7 monthly reports",
    );
  });

  it("prefixes dry-run forced guidance when a live run was downgraded", () => {
    const description = formatAutomationRunToastDescription(
      content.admin.automation.runSummary,
      makeRun({ status: "SUCCESS", trigger: "DRY_RUN", summary: sampleSummary, errors: null }),
      { dryRunForcedHint: runCopy.runDryRunForcedHint },
    );

    expect(description).toContain(runCopy.runDryRunForcedHint);
    expect(description).toContain("2 invoices · 1 reminders");
  });

  it("prefixes WhatsApp queue guidance when reminders were queued for Billing", () => {
    const description = formatAutomationRunToastDescription(
      content.admin.automation.runSummary,
      makeRun({
        status: "SUCCESS",
        summary: { ...sampleSummary, whatsAppQueued: 2 },
        errors: null,
      }),
      { whatsAppQueuedHint: runCopy.runWhatsAppQueuedHint },
    );

    expect(description).toContain(runCopy.runWhatsAppQueuedHint);
    expect(description).toContain("2 WhatsApp queued");
  });
});

describe("isAutomationDryRunForced", () => {
  it("detects when a live run completed as dry run", () => {
    expect(
      isAutomationDryRunForced(false, makeRun({ trigger: "DRY_RUN" })),
    ).toBe(true);
  });

  it("does not flag intentional preview runs", () => {
    expect(
      isAutomationDryRunForced(true, makeRun({ trigger: "DRY_RUN" })),
    ).toBe(false);
  });

  it("does not flag successful live runs", () => {
    expect(
      isAutomationDryRunForced(false, makeRun({ trigger: "MANUAL" })),
    ).toBe(false);
  });
});

describe("resolveAutomationRunToastTitle", () => {
  it("returns the warning title for partial live runs", () => {
    expect(
      resolveAutomationRunToastTitle(
        runCopy,
        makeRun({ status: "PARTIAL", trigger: "MANUAL" }),
        false,
      ),
    ).toBe(runCopy.runPartialSuccess);
  });

  it("returns the warning title for partial dry runs instead of dry-run success", () => {
    expect(
      resolveAutomationRunToastTitle(
        runCopy,
        makeRun({ status: "PARTIAL", trigger: "DRY_RUN" }),
        true,
      ),
    ).toBe(runCopy.runPartialSuccess);
  });

  it("returns the failed title for failed runs", () => {
    expect(
      resolveAutomationRunToastTitle(runCopy, makeRun({ status: "FAILED" }), false),
    ).toBe(runCopy.runFailed);
  });

  it("returns dry-run success for successful preview runs", () => {
    expect(
      resolveAutomationRunToastTitle(
        runCopy,
        makeRun({ status: "SUCCESS", trigger: "DRY_RUN" }),
        true,
      ),
    ).toBe(runCopy.runDryRunSuccess);
  });

  it("returns live success for successful manual runs", () => {
    expect(
      resolveAutomationRunToastTitle(
        runCopy,
        makeRun({ status: "SUCCESS", trigger: "MANUAL" }),
        false,
      ),
    ).toBe(runCopy.runSuccess);
  });

  it("returns the dry-run forced title when Run Now was downgraded by dry run mode", () => {
    expect(
      resolveAutomationRunToastTitle(
        runCopy,
        makeRun({ status: "SUCCESS", trigger: "DRY_RUN" }),
        false,
      ),
    ).toBe(runCopy.runDryRunForced);
  });
});

describe("formatAutomationRunRequestError", () => {
  it("returns API error messages for blocked manual runs", () => {
    expect(
      formatAutomationRunRequestError(
        new ApiError(403, {
          message: "Automations are disabled. Enable automations or use preview run.",
        }),
      ),
    ).toBe("Automations are disabled. Enable automations or use preview run.");
  });

  it("returns validation details from bad run requests", () => {
    expect(
      formatAutomationRunRequestError(
        new ApiError(400, {
          message: "Validation failed",
          details: {
            formErrors: ["dryRun must be a boolean"],
            fieldErrors: {},
          },
        }),
      ),
    ).toBe("dryRun must be a boolean");
  });

  it("falls back to server detail when the message is generic", () => {
    expect(
      formatAutomationRunRequestError(
        new ApiError(500, {
          message: "Request failed",
          detail: "SMTP connection timed out",
        }),
      ),
    ).toBe("SMTP connection timed out");
  });

  it("returns native error messages for unexpected failures", () => {
    expect(formatAutomationRunRequestError(new Error("Network unavailable"))).toBe(
      "Network unavailable",
    );
  });
});
