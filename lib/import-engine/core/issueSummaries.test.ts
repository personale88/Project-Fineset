import { describe, expect, it } from "vitest";
import {
  collectErrorSummaries,
  collectWarningSummaries,
} from "./issueSummaries";
import type { TransformedRow } from "../types";

function row(partial: Partial<TransformedRow> & Pick<TransformedRow, "originalIndex" | "status">): TransformedRow {
  return {
    rawData: {},
    transformedData: {},
    customerData: {},
    errors: [],
    warnings: [],
    customerType: "new",
    ...partial,
  };
}

describe("collectErrorSummaries", () => {
  it("groups blocking errors with fix hints", () => {
    const summaries = collectErrorSummaries([
      row({
        originalIndex: 0,
        status: "error",
        errors: [
          {
            column: "Customer Phone",
            message: '"bad" is not a valid phone number',
            code: "INVALID_PHONE",
          },
        ],
      }),
      row({
        originalIndex: 1,
        status: "error",
        errors: [
          {
            column: "Customer Phone",
            message: '"123" is not a valid phone number',
            code: "INVALID_PHONE",
          },
        ],
      }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.count).toBe(2);
    expect(summaries[0]?.severity).toBe("blocking");
    expect(summaries[0]?.willImport).toBe(false);
    expect(summaries[0]?.fixHint).toContain("10 digits");
  });
});

describe("collectWarningSummaries", () => {
  it("groups staff lookup warnings with fix hints", () => {
    const summaries = collectWarningSummaries([
      row({
        originalIndex: 0,
        status: "warning",
        warnings: [
          {
            column: "Staff Name",
            message: '"John" was not found in staff',
          },
        ],
      }),
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.severity).toBe("review");
    expect(summaries[0]?.willImport).toBe(true);
    expect(summaries[0]?.fixHint).toContain("staff");
  });
});
