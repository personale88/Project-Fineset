import { describe, expect, it } from "vitest";
import {
  AI_REPORT_PARSE_FALLBACK_SUMMARY,
  parseAiReportJson,
} from "@/lib/analytics/ask-ai-report";

describe("parseAiReportJson", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      summary: "Revenue grew 12% in the period.",
      highlights: ["Visits up", "Conversion steady"],
      recommendations: ["Coach staff on GHS"],
    });

    const result = parseAiReportJson(raw);
    expect(result.ok).toBe(true);
    expect(result.report.summary).toBe("Revenue grew 12% in the period.");
    expect(result.report.highlights).toEqual(["Visits up", "Conversion steady"]);
    expect(result.report.recommendations).toEqual(["Coach staff on GHS"]);
  });

  it("parses JSON wrapped in markdown fences", () => {
    const raw = `\`\`\`json
{"summary":"Store Alpha led visits.","highlights":["A"],"recommendations":["B"]}
\`\`\``;

    const result = parseAiReportJson(raw);
    expect(result.ok).toBe(true);
    expect(result.report.summary).toBe("Store Alpha led visits.");
  });

  it("returns fallback when JSON is truncated", () => {
    const raw = '{"summary": "Partial response without closing brace"';

    const result = parseAiReportJson(raw);
    expect(result.ok).toBe(false);
    expect(result.report.summary).toBe(AI_REPORT_PARSE_FALLBACK_SUMMARY);
  });

  it("returns fallback when summary is empty", () => {
    const raw = JSON.stringify({
      summary: "   ",
      highlights: [],
      recommendations: [],
    });

    const result = parseAiReportJson(raw);
    expect(result.ok).toBe(false);
    expect(result.report.summary).toBe(AI_REPORT_PARSE_FALLBACK_SUMMARY);
  });

  it("filters non-string highlight entries", () => {
    const raw = JSON.stringify({
      summary: "OK",
      highlights: ["valid", 42, null, "also valid"],
      recommendations: ["do this"],
    });

    const result = parseAiReportJson(raw);
    expect(result.ok).toBe(true);
    expect(result.report.highlights).toEqual(["valid", "also valid"]);
  });
});
