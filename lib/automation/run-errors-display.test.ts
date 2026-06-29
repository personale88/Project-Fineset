import { describe, expect, it } from "vitest";
import {
  automationRunErrorsWereRedacted,
  getAutomationRunErrorMessagesForDisplay,
  formatAutomationRunErrorsForDisplay,
  sanitizeAutomationRunErrorForDisplay,
} from "@/lib/automation/run-errors-display";

describe("sanitizeAutomationRunErrorForDisplay", () => {
  it("removes business names from scoped automation errors", () => {
    expect(
      sanitizeAutomationRunErrorForDisplay("Jewelry Store Alpha: Simulated invoice send failure"),
    ).toBe("Simulated invoice send failure");
  });

  it("removes recipient emails from scoped automation errors", () => {
    expect(
      sanitizeAutomationRunErrorForDisplay("owner@example.com: Monthly report failed"),
    ).toBe("Monthly report failed");
  });

  it("leaves global automation errors unchanged", () => {
    expect(
      sanitizeAutomationRunErrorForDisplay(
        "SMTP is not configured — invoice automation skipped.",
      ),
    ).toBe("SMTP is not configured — invoice automation skipped.");
  });
});

describe("getAutomationRunErrorMessagesForDisplay", () => {
  it("returns deduplicated redacted messages as a list", () => {
    expect(
      getAutomationRunErrorMessagesForDisplay([
        "Store Alpha: Simulated invoice send failure",
        "Store Beta: Simulated invoice send failure",
        "Store Gamma: Payment reminder failed",
      ]),
    ).toEqual(["Simulated invoice send failure", "Payment reminder failed"]);
  });
});

describe("formatAutomationRunErrorsForDisplay", () => {
  it("deduplicates identical messages after redacting business identifiers", () => {
    expect(
      formatAutomationRunErrorsForDisplay([
        "Store Alpha: Simulated invoice send failure",
        "Store Beta: Simulated invoice send failure",
      ]),
    ).toBe("Simulated invoice send failure");
  });

  it("joins distinct redacted messages", () => {
    expect(
      formatAutomationRunErrorsForDisplay([
        "Store Alpha: Simulated invoice send failure",
        "Store Beta: Payment reminder failed",
      ]),
    ).toBe("Simulated invoice send failure · Payment reminder failed");
  });
});

describe("automationRunErrorsWereRedacted", () => {
  it("detects when at least one error contained a scoped identifier", () => {
    expect(
      automationRunErrorsWereRedacted(["Store Alpha: Simulated invoice send failure"]),
    ).toBe(true);
    expect(
      automationRunErrorsWereRedacted(["SMTP is not configured — invoice automation skipped."]),
    ).toBe(false);
  });
});
