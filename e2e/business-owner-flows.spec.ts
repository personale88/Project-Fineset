import { test, expect } from "@playwright/test";
import { loginWithEmail } from "./helpers/login";
import { devPortalUsersReady } from "./helpers/fixtures";

const portalUsersReady = devPortalUsersReady();

test.describe("Business owner authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!portalUsersReady, "Run npm run db:seed (Store Alpha) for E2E portal users");
    await loginWithEmail(page, {
      email: "manager@store-alpha.local",
      dashboardPattern: /\/business-owner\/dashboard/,
    });
  });

  test("dashboard shell loads", async ({ page }) => {
    await expect(page.getByTestId("portal-shell")).toBeVisible();
  });

  test("profile billing section is reachable", async ({ page }) => {
    await page.goto("/business-owner/dashboard/profile?section=billing");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /billing & subscription/i })).toBeVisible();
  });

  test("visits page with import is reachable", async ({ page }) => {
    await page.goto("/business-owner/dashboard/visits");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /visits/i })).toBeVisible();
  });
});

test.describe("Business owner API protection", () => {
  test("import API rejects unauthenticated requests", async ({ browser }) => {
    const context = await browser.newContext();
    const response = await context.request.get("/api/import/history");
    expect(response.status()).toBe(401);
    await context.close();
  });

  test("customers API rejects unauthenticated requests", async ({ browser }) => {
    const context = await browser.newContext();
    const response = await context.request.get("/api/customers?page=1&pageSize=1");
    expect(response.status()).toBe(401);
    await context.close();
  });
});
