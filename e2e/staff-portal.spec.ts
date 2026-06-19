import { test, expect } from "@playwright/test";

const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;
const hasE2eCredentials = Boolean(e2eEmail && e2ePassword);
const canRunStaffPortalTests = hasE2eCredentials;

test.describe("Staff portal (unauthenticated)", () => {
  test("staff dashboard redirects to login", async ({ page }) => {
    await page.goto("/staff/dashboard");
    await expect(page).not.toHaveURL(/\/staff\/dashboard$/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("staff my-visits redirects to login", async ({ page }) => {
    await page.goto("/staff/dashboard/my-visits");
    await expect(page).not.toHaveURL(/\/staff\/dashboard\/my-visits/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Staff portal (authenticated)", () => {
  test.skip(
    !canRunStaffPortalTests,
    "Set E2E_USER_EMAIL and E2E_USER_PASSWORD to run staff portal tests",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.fill('[name="email"]', e2eEmail!);
    await page.fill('[name="password"]', e2ePassword!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test("staff dashboard shows work queue section", async ({ page }) => {
    await page.goto("/staff/dashboard");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /your work queue/i })).toBeVisible();
  });

  test("staff work queue API responds", async ({ page }) => {
    const res = await page.request.get("/api/staff/work-queue?limit=5");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("items");
    expect(Array.isArray(body.items)).toBeTruthy();
  });

  test("staff digest API responds", async ({ page }) => {
    const res = await page.request.get("/api/staff/digest");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("overdue");
    expect(body).toHaveProperty("dueToday");
  });

  test("staff my-visits page loads", async ({ page }) => {
    await page.goto("/staff/dashboard/my-visits");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByRole("heading", { name: /my visits/i })).toBeVisible();
  });
});
