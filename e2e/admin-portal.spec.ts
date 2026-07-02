import { test, expect } from "@playwright/test";
import { dismissAdminOnboarding, loginAsAdmin } from "./helpers/admin";

test.describe("Admin portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("main nav tabs are reachable", async ({ page }) => {
    const tabs = [
      { href: "/admin/dashboard", heading: /Business Portfolio/i },
      { href: "/admin/dashboard/analytics", heading: /AI Analytics/i },
      { href: "/admin/dashboard/accounts", heading: /accounts/i },
      { href: "/admin/dashboard/billing", heading: /billing & payments/i },
      { href: "/admin/dashboard/automation", heading: /automation center/i },
    ];

    for (const tab of tabs) {
      await page.goto(tab.href);
      await dismissAdminOnboarding(page);
      await expect(page.getByRole("heading", { name: tab.heading, level: 1 })).toBeVisible();
    }
  });

  test("accounts page shows client scope or empty state", async ({ page }) => {
    await page.goto("/admin/dashboard/accounts");
    await expect(page.getByRole("heading", { name: "Accounts", level: 1 })).toBeVisible();
    await expect(page.getByRole("tab", { name: /client accounts/i })).toBeVisible();
  });
});
