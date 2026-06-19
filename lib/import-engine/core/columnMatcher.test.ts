import { describe, expect, it } from "vitest";
import { fuzzyScore } from "@/lib/import-engine/utils/fuzzyMatch";
import { matchColumns } from "@/lib/import-engine/core/columnMatcher";
import { visitLogSchema } from "@/lib/import-engine/schema-configs/visitLogSchema";

describe("fuzzyScore", () => {
  it("returns 100 for identical strings", () => {
    expect(fuzzyScore("Customer Phone", "customer phone")).toBe(100);
  });

  it("returns lower score for different strings", () => {
    expect(fuzzyScore("phone", "email")).toBeLessThan(50);
  });
});

describe("matchColumns", () => {
  it("auto-maps common visit log headers", () => {
    const { mappings } = matchColumns(
      ["Customer Name", "Mobile No", "Visit Date", "Staff Name"],
      visitLogSchema,
    );

    expect(mappings.find((m) => m.uploadedHeader === "Mobile No")?.matchedColumn?.dbColumn).toBe(
      "phone",
    );
    expect(mappings.find((m) => m.uploadedHeader === "Visit Date")?.confidenceLevel).toBe("HIGH");
  });
});
