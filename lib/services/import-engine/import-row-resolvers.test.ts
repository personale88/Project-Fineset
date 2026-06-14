import { describe, expect, it } from "vitest";
import {
  resolveImportCustomerPhone,
  resolveImportStaffId,
  syntheticImportPhone,
} from "./import-row-resolvers";
import type { TransformedRow } from "@/lib/import-engine/types";

function row(partial: Partial<TransformedRow>): TransformedRow {
  return {
    originalIndex: 0,
    rawData: {},
    transformedData: {},
    customerData: {},
    status: "warning",
    errors: [],
    warnings: [],
    customerType: "new",
    ...partial,
  };
}

describe("import row resolvers", () => {
  it("uses synthetic phone when customer phone is missing", () => {
    expect(
      resolveImportCustomerPhone(
        row({ originalIndex: 42, customerData: { name: "Test" } }),
      ),
    ).toBe(syntheticImportPhone(42));
  });

  it("keeps mapped staff when present", () => {
    expect(
      resolveImportStaffId(
        row({ transformedData: { staffId: "staff-1" } }),
        "fallback",
      ),
    ).toBe("staff-1");
  });

  it("falls back to store staff when row staff is missing", () => {
    expect(resolveImportStaffId(row({}), "fallback")).toBe("fallback");
  });
});
