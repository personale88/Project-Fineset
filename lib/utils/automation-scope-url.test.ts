import { describe, expect, it } from "vitest";
import {
  AUTOMATION_CONFIG_SCOPES,
  automationScopeHref,
  parseAutomationScope,
} from "@/lib/utils/automation-scope-url";

describe("parseAutomationScope", () => {
  it("returns overview for missing or invalid values", () => {
    expect(parseAutomationScope(null)).toBe("overview");
    expect(parseAutomationScope(undefined)).toBe("overview");
    expect(parseAutomationScope("")).toBe("overview");
    expect(parseAutomationScope("not-a-scope")).toBe("overview");
  });

  it("returns valid scope keys from the URL", () => {
    expect(parseAutomationScope("billingCycle")).toBe("billingCycle");
    expect(parseAutomationScope("history")).toBe("history");
    expect(parseAutomationScope("whatsApp")).toBe("whatsApp");
  });
});

describe("automationScopeHref", () => {
  const pathname = "/admin/dashboard/automation";

  it("omits scope for overview", () => {
    const params = new URLSearchParams("scope=billingCycle&foo=bar");
    expect(automationScopeHref(pathname, params, "overview")).toBe(
      "/admin/dashboard/automation?foo=bar",
    );
  });

  it("sets scope for non-overview tabs", () => {
    const params = new URLSearchParams("foo=bar");
    expect(automationScopeHref(pathname, params, "billingCycle")).toBe(
      "/admin/dashboard/automation?foo=bar&scope=billingCycle",
    );
  });

  it("returns pathname only when no query params remain", () => {
    expect(automationScopeHref(pathname, new URLSearchParams(), "overview")).toBe(pathname);
  });
});

describe("AUTOMATION_CONFIG_SCOPES", () => {
  it("lists every config tab except run history", () => {
    expect(AUTOMATION_CONFIG_SCOPES).toEqual([
      "overview",
      "billingCycle",
      "invoices",
      "paymentReminders",
      "followUps",
      "expiryRenewal",
      "monthlyReports",
      "whatsApp",
    ]);
    expect(AUTOMATION_CONFIG_SCOPES).not.toContain("history");
  });
});
