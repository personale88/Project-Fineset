import { test, expect } from "@playwright/test";

const DEV_PASSWORD = "FineSet#1dev";

const PORTAL_USERS = [
  {
    label: "staff",
    email: "staff-a@store-alpha.local",
    dashboard: /\/staff\/dashboard/,
  },
  {
    label: "store manager",
    email: "store-manager@store-alpha.local",
    dashboard: /\/store-manager\/dashboard/,
  },
  {
    label: "business owner",
    email: "manager@store-alpha.local",
    dashboard: /\/business-owner\/dashboard/,
  },
  {
    label: "master admin",
    email: process.env.E2E_USER_EMAIL ?? process.env.MASTER_ADMIN_EMAIL ?? "admin@fineset.local",
    password:
      process.env.E2E_USER_PASSWORD ??
      process.env.MASTER_ADMIN_PASSWORD ??
      DEV_PASSWORD,
    dashboard: /\/admin\/dashboard/,
  },
] as const;

for (const user of PORTAL_USERS) {
  test(`login as ${user.label} reaches dashboard`, async ({ page }) => {
    const password = "password" in user ? user.password : DEV_PASSWORD;

    await page.goto("/");
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForURL(user.dashboard, { timeout: 15_000 });
    await expect(page.getByTestId("portal-shell")).toBeVisible();
  });
}
