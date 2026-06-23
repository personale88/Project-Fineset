import { test, expect } from "@playwright/test";
import { dismissPortalOnboarding } from "./helpers/onboarding";
import { DEV_PASSWORD, loginWithEmail } from "./helpers/login";

const e2eEmail = process.env.E2E_USER_EMAIL ?? "staff-a@store-alpha.local";
const e2ePassword = process.env.E2E_USER_PASSWORD ?? DEV_PASSWORD;
const canRunStaffPortalTests = Boolean(e2eEmail);

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
    "Set E2E_USER_EMAIL to run staff portal tests",
  );

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      for (const role of ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"]) {
        localStorage.setItem(`fineset-onboarding-seen:${role}`, "1");
      }
    });
    await loginWithEmail(page, {
      email: e2eEmail,
      password: e2ePassword,
      dashboardPattern: /\/dashboard/,
    });
    await dismissPortalOnboarding(page);
  });

  test("staff dashboard shows work queue section", async ({ page }) => {
    await page.goto("/staff/dashboard");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await dismissPortalOnboarding(page);
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
    await dismissPortalOnboarding(page);
    await expect(page.getByRole("heading", { level: 1, name: /my visits/i })).toBeVisible();
  });
});
