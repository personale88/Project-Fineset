import { describe, expect, it } from "vitest";
import { isEmptyPlaceholder, normalizeRawValue } from "./emptyPlaceholder";

describe("isEmptyPlaceholder", () => {
  it("treats dash-only patterns as empty", () => {
    expect(isEmptyPlaceholder("-")).toBe(true);
    expect(isEmptyPlaceholder("- - - -")).toBe(true);
    expect(isEmptyPlaceholder("----")).toBe(true);
    expect(isEmptyPlaceholder("— —")).toBe(true);
  });

  it("treats common text placeholders as empty", () => {
    expect(isEmptyPlaceholder("N/A")).toBe(true);
    expect(isEmptyPlaceholder("unknown")).toBe(true);
    expect(isEmptyPlaceholder("xxx")).toBe(true);
  });

  it("keeps real values", () => {
    expect(isEmptyPlaceholder("9866318393")).toBe(false);
    expect(isEmptyPlaceholder("1HR 2 MINS")).toBe(false);
  });
});

describe("normalizeRawValue", () => {
  it("returns null for placeholder patterns", () => {
    expect(normalizeRawValue("- - - -")).toBeNull();
  });
});
