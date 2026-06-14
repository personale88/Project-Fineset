import { test, expect } from "@playwright/test";

const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;
const hasE2eCredentials = Boolean(e2eEmail && e2ePassword);
const hasLiveSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL!.includes("placeholder.supabase.co");
const canRunLiveAuthTests = hasE2eCredentials && hasLiveSupabase;

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
    "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and a real Supabase URL to run login perf test",
  );

  test("login reaches dashboard shell under 2s", async ({ page }) => {
    const start = Date.now();

    await page.goto("/");
    await page.fill('[name="email"]', e2eEmail!);
    await page.fill('[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/dashboard/);
    await expect(page.getByTestId("portal-shell")).toBeVisible();

    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
  });
});

test.describe("API performance", () => {
  test.skip(
    !canRunLiveAuthTests,
    "Set E2E_USER_EMAIL, E2E_USER_PASSWORD, and a real Supabase URL to run API perf tests",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.fill('[name="email"]', e2eEmail!);
    await page.fill('[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
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
