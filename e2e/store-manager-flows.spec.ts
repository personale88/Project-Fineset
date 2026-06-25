import { test, expect } from "@playwright/test";
import { loginWithEmail } from "./helpers/login";
import { devPortalUsersReady } from "./helpers/fixtures";

const portalUsersReady = devPortalUsersReady();

test.describe("Store manager authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!portalUsersReady, "Run npm run db:seed (Store Alpha) for E2E portal users");
    await loginWithEmail(page, {
      email: "store-manager@store-alpha.local",
      dashboardPattern: /\/store-manager\/dashboard/,
    });
  });

  test("dashboard shell loads", async ({ page }) => {
    await expect(page.getByTestId("portal-shell")).toBeVisible();
  });

  test("log visit page is reachable", async ({ page }) => {
    await page.goto("/store-manager/dashboard/log-visit");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /log customer visit/i })).toBeVisible();
  });

  test("team hub is reachable", async ({ page }) => {
    await page.goto("/store-manager/dashboard/team");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /team/i })).toBeVisible();
  });
});

test.describe("Store manager API protection", () => {
  test("billing API rejects unauthenticated requests", async ({ browser }) => {
    const context = await browser.newContext();
    const response = await context.request.get("/api/billing/portal-details");
    expect(response.status()).toBe(401);
    await context.close();
  });
});
