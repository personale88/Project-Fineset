import { describe, expect, it } from "vitest";
import { parseDurationToMinutes, parseDurationToSeconds } from "./dateParser";
import { isEmptyPlaceholder } from "./emptyPlaceholder";

describe("isEmptyPlaceholder", () => {
  it("treats dash-like sentinels as empty", () => {
    expect(isEmptyPlaceholder("-")).toBe(true);
    expect(isEmptyPlaceholder(" — ")).toBe(true);
    expect(isEmptyPlaceholder("N/A")).toBe(true);
  });

  it("keeps real values", () => {
    expect(isEmptyPlaceholder("9876543210")).toBe(false);
    expect(isEmptyPlaceholder("1HR 2 MINS")).toBe(false);
  });
});

describe("parseDurationToMinutes", () => {
  it("parses hour and minute phrases", () => {
    expect(parseDurationToMinutes("1HR 2 MINS")).toBe(62);
    expect(parseDurationToMinutes("1 hr 2 min")).toBe(62);
    expect(parseDurationToMinutes("2 HR")).toBe(120);
  });

  it("parses minutes-only and clock-style values", () => {
    expect(parseDurationToMinutes("45 mins")).toBe(45);
    expect(parseDurationToMinutes("1:30")).toBe(90);
    expect(parseDurationToMinutes("90")).toBe(90);
  });
});

describe("parseDurationToSeconds", () => {
  it("parses mm:ss and human-readable durations", () => {
    expect(parseDurationToSeconds("5:30")).toBe(330);
    expect(parseDurationToSeconds("1HR 2 MINS")).toBe(3720);
  });
});
