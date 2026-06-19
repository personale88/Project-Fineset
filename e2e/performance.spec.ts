import { test, expect } from "@playwright/test";
import { createRequestCounter, waitMs } from "./helpers/network";
import baselines from "../tests/perf/baselines.json";

const e2eEmail = process.env.E2E_USER_EMAIL ?? process.env.MASTER_ADMIN_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD ?? process.env.MASTER_ADMIN_PASSWORD;
const hasE2eCredentials = Boolean(e2eEmail && e2ePassword);

function baselineMs(key: keyof typeof baselines.api): number | undefined {
  const value = baselines.api[key];
  return typeof value === "number" ? value : undefined;
}

test.describe("API performance", () => {
  test.skip(!hasE2eCredentials, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.fill('[name="email"]', e2eEmail!);
    await page.fill('[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test("D1.1 store portfolio responds under budget", async ({ page }) => {
    const started = Date.now();
    const res = await page.request.get("/api/analytics/store/portfolio?period=week");
    expect(res.ok()).toBeTruthy();
    const elapsed = Date.now() - started;
    const budget = 5000;
    const baseline = baselineMs("storePortfolio");
    expect(elapsed).toBeLessThan(baseline ? Math.ceil(baseline * 1.2) : budget);
  });

  test("D1.2 store calls responds under budget", async ({ page }) => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const started = Date.now();
    const res = await page.request.get(
      `/api/calls?page=1&pageSize=15&year=${year}&month=${month}`,
    );
    expect(res.ok()).toBeTruthy();
    const elapsed = Date.now() - started;
    const budget = 5000;
    const baseline = baselineMs("calls");
    expect(elapsed).toBeLessThan(baseline ? Math.ceil(baseline * 1.2) : budget);
  });

  test("D1.3 field sales responds under budget", async ({ page }) => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const started = Date.now();
    const res = await page.request.get(
      `/api/field-sales?page=1&pageSize=15&year=${year}&month=${month}`,
    );
    expect(res.ok()).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(
      baselineMs("fieldSales") ? Math.ceil(baselineMs("fieldSales")! * 1.2) : 3000,
    );
  });

  test("D1.4 staff list responds under budget", async ({ page }) => {
    const started = Date.now();
    const res = await page.request.get("/api/staff");
    expect(res.ok()).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(
      baselineMs("staff") ? Math.ceil(baselineMs("staff")! * 1.2) : 4000,
    );
  });
});

test.describe("Navigation performance", () => {
  test.skip(!hasE2eCredentials, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.fill('[name="email"]', e2eEmail!);
    await page.fill('[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test("D2.1 store dashboard avoids duplicate portfolio fetches", async ({ page }) => {
    const portfolioRequests = createRequestCounter(
      page,
      "/api/analytics/store/portfolio",
    );

    await page.goto("/business-owner/dashboard");
    await page.getByTestId("portal-shell").waitFor({ state: "visible" });
    await waitMs(3000);

    expect(portfolioRequests.count()).toBeLessThanOrEqual(1);
    portfolioRequests.stop();
  });

  test("D3.2 store portfolio shell loads under 4s", async ({ page }) => {
    const started = Date.now();
    await page.goto("/business-owner/dashboard");
    await page.getByTestId("portal-shell").waitFor({ state: "visible" });
    expect(Date.now() - started).toBeLessThan(4000);
  });
});
