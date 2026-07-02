import { test, expect } from "@playwright/test";
import { dismissAdminOnboarding, loginAsAdmin } from "./helpers/admin";

test.describe("Admin AI Analytics", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/dashboard/analytics");
    await dismissAdminOnboarding(page);
    await expect(page.getByRole("heading", { name: /AI Analytics/i, level: 1 })).toBeVisible();
  });

  test("Analyze is disabled until scope is selected", async ({ page }) => {
    await expect(page.locator("#analytics-ask-prompt-desktop")).toBeVisible();
    await page.locator("#analytics-ask-prompt-desktop").fill("Last 7 days visits by customer type");
    await expect(page.getByRole("button", { name: /^Analyze$/i })).toBeDisabled();
  });

  test("selecting All stores enables Analyze", async ({ page }) => {
    await page.locator("#analytics-store-filter").click();
    await page.getByRole("option", { name: /^All stores$/i }).click();
    await page.locator("#analytics-ask-prompt-desktop").fill("Last 7 days visits by customer type");
    await expect(page.getByRole("button", { name: /^Analyze$/i })).toBeEnabled();
  });

  test("mobile layout shows scope and quick prompt hints without horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/dashboard/analytics");
    await dismissAdminOnboarding(page);

    await expect(page.getByText(/Select a store/i).first()).toBeVisible();
    const overflow = await page.evaluate(() => ({
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(overflow.doc).toBeLessThanOrEqual(2);

    const hints = page.locator('[data-analytics-suggestions] button[role="listitem"]');
    await expect(hints.first()).toBeVisible();
    await expect(hints.first()).not.toContainText("Last 30 days revenue trend");
  });

  test("scope change does not auto request", async ({ page }) => {
    await page.route("**/api/analytics/admin/business/ask", async (route) => {
      const body = route.request().postDataJSON() as { prompt?: string };
      if (body.prompt?.includes("intercept-once")) {
        await route.fulfill({
          status: 200,
          contentType: "text/event-stream",
          body: [
            'data: {"type":"status","data":{"phase":"parsing","message":"Understanding"}}',
            'data: {"type":"intent","data":{"interpretedQuery":"Test","parseSource":"rules","parseConfidence":"high","geminiConfigured":false}}',
            'data: {"type":"status","data":{"phase":"querying","message":"Fetching"}}',
            'data: {"type":"kpis","data":{"period":{"start":"2026-01-01","end":"2026-06-30","label":"Last 30 days"},"summary":{"totalVisits":10,"totalRevenue":1000,"conversionRate":50,"uniqueCustomers":10,"avgTransaction":100,"fieldSalesCount":0},"kpiCards":[],"charts":[],"appliedFilters":[],"scopeLabel":"All stores","dataAvailability":"ok","dataConfidence":"low"}}',
            'data: {"type":"status","data":{"phase":"thinking","message":"Analyzing"}}',
            'data: {"type":"report_complete","data":{"report":{"summary":"Done","highlights":[],"recommendations":[]}}}',
            'data: {"type":"done","data":{"status":"success","balanceCredits":49,"tokenUsage":null}}',
            "",
          ].join("\n"),
        });
        return;
      }
      await route.continue();
    });

    await page.locator("#analytics-store-filter").click();
    await page.getByRole("option", { name: /^All stores$/i }).click();
    await page.locator("#analytics-ask-prompt-desktop").fill("intercept-once test prompt");
    await page.getByRole("button", { name: /^Analyze$/i }).click();
    await expect(page.getByText(/We understood/i)).toBeVisible({ timeout: 30_000 });

    let askCount = 0;
    page.on("request", (request) => {
      if (
        request.url().includes("/api/analytics/admin/business/ask") &&
        request.method() === "POST"
      ) {
        askCount += 1;
      }
    });

    await page.locator("#analytics-store-filter").click();
    const storeOption = page.getByRole("option").filter({ hasNotText: /Select a store|All stores/i }).first();
    if (await storeOption.isVisible()) {
      await storeOption.click();
      await page.waitForTimeout(500);
      expect(askCount).toBe(0);
    }
  });
});
