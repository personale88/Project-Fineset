import { test, expect } from "@playwright/test";
import { DEV_PASSWORD, loginWithEmail } from "./helpers/login";
import { devPortalUsersReady } from "./helpers/fixtures";

const e2eEmail = process.env.E2E_USER_EMAIL ?? process.env.MASTER_ADMIN_EMAIL ?? "admin@fineset.local";
const e2ePassword = process.env.E2E_USER_PASSWORD ?? process.env.MASTER_ADMIN_PASSWORD ?? DEV_PASSWORD;
const canRunLiveAuthTests = Boolean(e2eEmail);
const e2eStoreEmail = "store-manager@store-alpha.local";

test.describe("Public routes", () => {
  test("home page loads login", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("legacy login route redirects to home", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("legacy staff login redirects to home", async ({ page }) => {
    await page.goto("/staff/login");
    await expect(page).toHaveURL("/");
  });

  test("legacy store dashboard redirects unauthenticated users to login with remapped callback", async ({
    page,
  }) => {
    await page.goto("/store/dashboard/visits");
    await expect(page).not.toHaveURL(/\/store\/dashboard\/visits/);
    await expect(page).toHaveURL(/callbackUrl=%2Fbusiness-owner%2Fdashboard%2Fvisits/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Protected dashboard routes", () => {
  test("store manager visits redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/store-manager/dashboard/visits");
    await expect(page).not.toHaveURL(/\/store-manager\/dashboard\/visits/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("business owner visits redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/business-owner/dashboard/visits");
    await expect(page).not.toHaveURL(/\/business-owner\/dashboard\/visits/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("admin overview redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("staff calls redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/staff/dashboard/calls");
    await expect(page).not.toHaveURL(/\/staff\/dashboard\/calls/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Auth performance", () => {
  test.skip(
    !canRunLiveAuthTests,
    "Set E2E_USER_EMAIL (or MASTER_ADMIN_EMAIL) to run login perf test",
  );

  test("login reaches dashboard shell under 2s", async ({ page }) => {
    const start = Date.now();

    await loginWithEmail(page, {
      email: e2eEmail,
      password: e2ePassword,
      dashboardPattern: /\/dashboard/,
    });
    await expect(page.getByTestId("portal-shell")).toBeVisible();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});

test.describe("API performance", () => {
  test.skip(
    !canRunLiveAuthTests,
    "Set E2E_USER_EMAIL (or MASTER_ADMIN_EMAIL) to run API perf tests",
  );

  test.beforeEach(async ({ page }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed so Store Alpha E2E users exist");

    await loginWithEmail(page, {
      email: e2eStoreEmail,
      password: e2ePassword,
      dashboardPattern: /\/store-manager\/dashboard/,
    });
  });

  test("store overview bundle responds under 5s", async ({ page }) => {
    const started = Date.now();
    const res = await page.request.get(
      "/api/analytics/store/overview?period=week",
    );
    expect(res.ok()).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(5000);
  });

  test("visits list responds under 3s", async ({ page }) => {
    const started = Date.now();
    const res = await page.request.get("/api/visits?page=1&pageSize=20");
    expect(res.ok()).toBeTruthy();
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
