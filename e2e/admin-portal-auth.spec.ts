import { test, expect } from "@playwright/test";

const adminRoutes = [
  "/admin/dashboard",
  "/admin/dashboard/analytics",
  "/admin/dashboard/accounts",
  "/admin/dashboard/billing",
  "/admin/dashboard/automation",
  "/admin/dashboard/settings",
  "/admin/dashboard/visits",
  "/admin/dashboard/calls",
  "/admin/dashboard/field-sales",
  "/admin/dashboard/stores",
] as const;

const adminApiRoutes = [
  "/api/admin/settings",
  "/api/admin/billing/summaries",
  "/api/stores?page=1&pageSize=1",
  "/api/analytics/admin/credits",
  "/api/analytics/admin/credits/grant",
] as const;

test.describe("Admin portal auth guards", () => {
  for (const route of adminRoutes) {
    test(`${route} redirects unauthenticated users to sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace(/\//g, "\\/")));
      await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
      await expect(page.getByTestId("portal-shell")).toHaveCount(0);
    });
  }

  test("admin deep link preserves callbackUrl on redirect", async ({ page }) => {
    await page.goto("/admin/dashboard/billing?tab=payments");
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fdashboard%2Fbilling/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("client-side navigation to admin route redirects to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await page.evaluate(() => {
      window.history.pushState({}, "", "/admin/dashboard/accounts");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await page.goto("/admin/dashboard/accounts");
    await expect(page).not.toHaveURL(/\/admin\/dashboard\/accounts/);
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });
});

test.describe("Admin portal API auth guards", () => {
  test("protected admin APIs reject unauthenticated requests", async ({ browser }) => {
    const context = await browser.newContext();
    const request = context.request;

    for (const path of adminApiRoutes) {
      const method = path.includes("/grant") ? "post" : "get";
      const response =
        method === "post"
          ? await request.post(path, { data: { credits: 1 } })
          : await request.get(path);

      expect(response.status(), path).toBe(401);
    }

    await context.close();
  });
});
