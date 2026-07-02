import { describe, expect, it } from "vitest";
import { content } from "@/content/en";

describe("field force content strings", () => {
  it("exposes location verification copy for field sales and visits", () => {
    expect(content.fieldSalesForm.location.submitBlocked).toContain("GPS");
    expect(content.visitForm.location.submitBlocked).toContain("GPS");
    expect(content.fieldSalesForm.location.poorAccuracy).toContain("{meters}");
    expect(content.visitForm.location.exception.title).toContain("exception");
  });
});
