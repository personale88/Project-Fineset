import { describe, expect, it } from "vitest";
import {
  buildVisitPurchaseStatusBreakdown,
  countVisitPurchaseStatus,
  toVisitPurchaseStatusLabelRows,
} from "@/lib/utils/visit-analytics-breakdown";

describe("visit-analytics-breakdown", () => {
  it("counts purchased and not purchased visits", () => {
    const breakdown = buildVisitPurchaseStatusBreakdown([
      { purchaseStatus: "PURCHASED" },
      { purchaseStatus: "PURCHASED" },
      { purchaseStatus: "NOT_PURCHASED" },
    ]);

    expect(countVisitPurchaseStatus(breakdown, "PURCHASED")).toBe(2);
    expect(countVisitPurchaseStatus(breakdown, "NOT_PURCHASED")).toBe(1);
  });

  it("labels rows in stable order", () => {
    const rows = toVisitPurchaseStatusLabelRows(
      buildVisitPurchaseStatusBreakdown([
        { purchaseStatus: "NOT_PURCHASED" },
        { purchaseStatus: "PURCHASED" },
      ]),
    );

    expect(rows.map((row) => row.label)).toEqual(["Purchased", "Not purchased"]);
    expect(rows.map((row) => row.count)).toEqual([1, 1]);
  });
});
