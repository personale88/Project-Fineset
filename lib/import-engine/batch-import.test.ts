import { describe, expect, it } from "vitest";
import {
  batchCountForRows,
  buildImportProgressLabel,
  chunkImportRows,
  emptyImportResult,
  mergeImportResults,
} from "@/lib/import-engine/batch-import";

describe("batch-import", () => {
  it("chunks rows using the configured request batch size", () => {
    expect(chunkImportRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("merges chunk results for client-side progress", () => {
    const base = emptyImportResult("batch-1");
    const merged = mergeImportResults(base, {
      batchId: "batch-1",
      totalProcessed: 75,
      successCount: 70,
      errorCount: 5,
      newCustomersCreated: 40,
      repeatCustomersUpdated: 30,
      errors: [{ rowIndex: 1, error: "bad row" }],
      durationMs: 1200,
    });

    expect(merged.successCount).toBe(70);
    expect(merged.errorCount).toBe(5);
    expect(merged.errors).toHaveLength(1);
  });

  it("builds practical progress labels", () => {
    expect(
      buildImportProgressLabel(
        {
          processed: 150,
          total: 5140,
          batchIndex: 2,
          batchCount: 69,
          successCount: 140,
          errorCount: 10,
        },
        "saved",
      ),
    ).toBe("140 imported · 10 failed so far");
  });

  it("calculates batch count for large imports", () => {
    expect(batchCountForRows(5140, 75)).toBe(69);
  });
});
