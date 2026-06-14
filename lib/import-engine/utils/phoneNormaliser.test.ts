import { describe, expect, it } from "vitest";
import { normalisePhone } from "./phoneNormaliser";

describe("normalisePhone", () => {
  it("uses the first valid number when multiple are separated by slash", () => {
    expect(normalisePhone("9866318393/9440414757")).toBe("+919866318393");
  });

  it("falls back to the next candidate when the first is invalid", () => {
    expect(normalisePhone("-/9440414757")).toBe("+919440414757");
  });

  it("handles comma-separated numbers", () => {
    expect(normalisePhone("9866318393, 9440414757")).toBe("+919866318393");
  });

  it("treats dash placeholder patterns as empty", () => {
    expect(normalisePhone("- - - -")).toBeNull();
  });
});
