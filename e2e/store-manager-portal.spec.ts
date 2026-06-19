import { test, expect } from "@playwright/test";

const managerRoutes = [
  "/store-manager/dashboard",
  "/store-manager/dashboard/my-work",
  "/store-manager/dashboard/team",
  "/store-manager/dashboard/visits",
  "/store-manager/dashboard/my-visits",
  "/store-manager/dashboard/field-sales",
  "/store-manager/dashboard/my-field-sales",
  "/store-manager/dashboard/calls",
  "/store-manager/dashboard/my-calls",
  "/store-manager/dashboard/follow-ups",
  "/store-manager/dashboard/my-follow-ups",
  "/store-manager/dashboard/staff",
  "/store-manager/dashboard/log-visit",
  "/store-manager/dashboard/log-field-sale",
] as const;

test.describe("Store manager portal auth guards", () => {
  for (const route of managerRoutes) {
    test(`${route} redirects unauthenticated users to login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace(/\//g, "\\/")));
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    });
  }
});

test.describe("Store manager portal deep links", () => {
  test("follow-ups mismatched filter redirects unauthenticated users", async ({ page }) => {
    await page.goto("/store-manager/dashboard/follow-ups?filter=mismatched");
    await expect(page).not.toHaveURL(/\/store-manager\/dashboard\/follow-ups/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("visits highlight param redirects unauthenticated users", async ({ page }) => {
    await page.goto("/store-manager/dashboard/visits?highlight=cltesthighlight000000000");
    await expect(page).not.toHaveURL(/\/store-manager\/dashboard\/visits/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});
