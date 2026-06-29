import { test, expect } from "@playwright/test";
import { loginWithEmail } from "./helpers/login";
import { dismissPortalOnboarding } from "./helpers/onboarding";
import { devPortalUsersReady } from "./helpers/fixtures";

const portalUsersReady = devPortalUsersReady();

test.describe("Business owner authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!portalUsersReady, "Run npm run db:seed (Store Alpha) for E2E portal users");
    await page.addInitScript(() => {
      localStorage.setItem("fineset-onboarding-seen:BUSINESS_OWNER", "1");
    });
    await loginWithEmail(page, {
      email: "manager@store-alpha.local",
      dashboardPattern: /\/business-owner\/dashboard/,
    });
    await dismissPortalOnboarding(page);
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

  test("store work queue accordion opens with preview content", async ({ page }) => {
    await page.goto("/business-owner/dashboard");

    const overdueTrigger = page.getByTestId("work-queue-section-overdue_task-trigger");
    await expect(overdueTrigger).toBeVisible();
    await expect(overdueTrigger).toHaveAttribute("aria-expanded", "false");

    await overdueTrigger.click();
    await expect(overdueTrigger).toHaveAttribute("aria-expanded", "true");

    const panel = page.getByTestId("work-queue-section-overdue_task-panel");
    await expect(panel).toBeVisible();
    await expect(panel.locator("article, p").first()).toBeVisible();

    const dueTodayTrigger = page.getByTestId("work-queue-section-due_today_task-trigger");
    if (await dueTodayTrigger.count()) {
      await expect(dueTodayTrigger).toHaveAttribute("aria-expanded", "false");
      await dueTodayTrigger.click();
      await expect(dueTodayTrigger).toHaveAttribute("aria-expanded", "true");
      await expect(page.getByTestId("work-queue-section-due_today_task-panel")).toBeVisible();
    }
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
