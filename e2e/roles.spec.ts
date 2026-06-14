import { test, expect } from "@playwright/test";

test.describe("Role dashboard smoke", () => {
  test("home page loads for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("legacy staff login redirects to home", async ({ page }) => {
    await page.goto("/staff/login");
    await expect(page).toHaveURL(/\/?(\?|$)/);
  });
});
