import { test, expect } from "@playwright/test";
import { DEV_PASSWORD, loginWithEmail } from "./helpers/login";
import { dismissAdminOnboarding } from "./helpers/admin";
import { devPortalUsersReady } from "./helpers/fixtures";

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

const nonAdminPortalUsers = [
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

test.describe("Admin portal role guards", () => {
  for (const user of nonAdminPortalUsers) {
    for (const route of [
      "/admin/dashboard/automation",
      "/admin/dashboard/billing",
      "/admin/dashboard/accounts",
    ] as const) {
      test(`${user.label} is redirected away from ${route}`, async ({ page }) => {
        test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

        await loginWithEmail(page, {
          email: user.email,
          password: DEV_PASSWORD,
          dashboardPattern: user.dashboard,
        });

        await page.goto(route);
        await expect(page).toHaveURL(user.dashboard);
        await expect(page).not.toHaveURL(new RegExp(route.replace(/\//g, "\\/")));
        await expect(page.getByText(/automation center/i)).toHaveCount(0);
      });
    }
  }
});

test.describe("Admin portal billing permission guards", () => {
  test.describe.configure({ mode: "serial" });

  test("platform admin without billing is redirected from automation to overview", async ({
    page,
  }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

    await loginWithEmail(page, {
      email: "platform-admin-no-billing@store-alpha.local",
      password: DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/automation");
    await expect(page).toHaveURL(/\/admin\/dashboard\/?$/);
    await expect(page.getByText(/automation center/i)).toHaveCount(0);
  });

  test("platform admin without billing is redirected from billing to overview", async ({
    page,
  }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

    await loginWithEmail(page, {
      email: "platform-admin-no-billing@store-alpha.local",
      password: DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/billing");
    await expect(page).toHaveURL(/\/admin\/dashboard\/?$/);
    await expect(page.getByRole("heading", { name: /billing & payments/i })).toHaveCount(0);
  });

  test("platform admin with billing can open automation", async ({ page }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

    await loginWithEmail(page, {
      email: "platform-admin-billing@store-alpha.local",
      password: DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/automation");
    await dismissAdminOnboarding(page);
    await expect(page).toHaveURL(/\/admin\/dashboard\/automation/);
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();
  });

  test("platform admin with billing sees read-only automation controls", async ({ page }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

    await loginWithEmail(page, {
      email: "platform-admin-billing@store-alpha.local",
      password: DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/automation");
    await dismissAdminOnboarding(page);

    await expect(page.getByTestId("admin-read-only-banner")).toBeVisible();
    await expect(page.getByTestId("admin-read-only-banner")).toContainText(
      /only master admins can edit automation/i,
    );
    await expect(page.getByTestId("automation-scope-panel-desktop").getByTestId("automation-scope-read-only-hint")).toBeVisible();
    await expect(page.getByTestId("automation-section-read-only-hint")).toBeVisible();
    await expect(page.getByTestId("automation-save")).toHaveCount(0);
    await expect(page.getByTestId("automation-run-preview")).toHaveCount(0);
    await expect(page.getByTestId("automation-run-now")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /save changes/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /run automations now/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /preview run/i })).toHaveCount(0);
    await expect(page.getByRole("switch").first()).toBeDisabled();
    await expect(page.getByLabel(/timezone/i)).toBeDisabled();

    const configTabs = [
      /billing cycle/i,
      /invoices/i,
      /payment reminders/i,
      /follow-ups/i,
      /expiry & renewal/i,
      /monthly reports/i,
      /whatsapp/i,
    ];

    for (const tabName of configTabs) {
      await page.getByTestId("automation-scope-panel-desktop").getByRole("tab", { name: tabName }).click();
      await expect(page.getByTestId("automation-section-read-only-hint")).toBeVisible();
      await expect(page.getByTestId("automation-save")).toHaveCount(0);
      await expect(page.getByTestId("automation-run-preview")).toHaveCount(0);
      await expect(page.getByTestId("automation-run-now")).toHaveCount(0);
    }

    await page.getByTestId("automation-scope-panel-desktop").getByRole("tab", { name: /run history/i }).click();
    await expect(page.getByTestId("automation-save")).toHaveCount(0);
    await expect(page.getByTestId("automation-run-preview")).toHaveCount(0);
    await expect(page.getByTestId("automation-run-now")).toHaveCount(0);
  });

  test("platform admin sees read-only automation controls on mobile scope panel", async ({
    page,
  }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

    await page.setViewportSize({ width: 390, height: 844 });

    await loginWithEmail(page, {
      email: "platform-admin-billing@store-alpha.local",
      password: DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/automation");
    await dismissAdminOnboarding(page);

    await expect(page.getByTestId("automation-scope-panel-mobile")).toBeVisible();
    await expect(page.getByTestId("automation-scope-panel-mobile").getByTestId("automation-scope-read-only-hint")).toBeVisible();
    await expect(page.getByRole("switch").first()).toBeDisabled();
    await page.getByRole("tab", { name: /billing cycle/i }).click();
    await expect(page.getByLabel(/billing cycle starts/i)).toBeDisabled();
    await expect(page.getByTestId("automation-save")).toHaveCount(0);
    await expect(page.getByTestId("automation-run-preview")).toHaveCount(0);
    await expect(page.getByTestId("automation-run-now")).toHaveCount(0);
    await expect(page.getByTestId("automation-section-read-only-hint")).toBeVisible();
  });

  test("platform admin with billing sees read-only billing tab actions", async ({ page }) => {
    test.skip(!devPortalUsersReady(), "Run npm run db:seed (Store Alpha) so E2E dev portal users exist");

    await loginWithEmail(page, {
      email: "platform-admin-billing@store-alpha.local",
      password: DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/billing");
    await dismissAdminOnboarding(page);

    await expect(page.getByTestId("admin-read-only-banner")).toBeVisible();
    await expect(page.getByTestId("admin-read-only-banner")).toContainText(
      /view-only billing/i,
    );
    await expect(page.getByRole("button", { name: /send invoice/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /follow-up/i })).toHaveCount(0);
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

test.describe("Admin portal expired session guards", () => {
  test.describe.configure({ mode: "serial" });

  test("automation page redirects to login when session cookie is expired", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "fineset-session",
        value: "expired-invalid-token-for-e2e",
        url: "http://localhost:3000",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/admin/dashboard/automation");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByTestId("portal-shell")).toHaveCount(0);
    await expect(page.getByText(/automation center/i)).toHaveCount(0);
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fdashboard%2Fautomation/);
  });

  test("signed-out admin reloads automation to login without stale UI", async ({ page }) => {
    await loginWithEmail(page, {
      email: process.env.MASTER_ADMIN_EMAIL ?? "admin@fineset.local",
      password: process.env.MASTER_ADMIN_PASSWORD ?? DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.goto("/admin/dashboard/automation");
    await dismissAdminOnboarding(page);
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();

    const signOutResponse = await page.request.post("/api/auth/signout");
    expect(signOutResponse.ok()).toBeTruthy();

    await page.reload();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByTestId("portal-shell")).toHaveCount(0);
    await expect(page.getByText(/automation center/i)).toHaveCount(0);
  });

  test("login page stays on sign-in after expired session cookie is cleared", async ({
    page,
  }) => {
    await loginWithEmail(page, {
      email: process.env.MASTER_ADMIN_EMAIL ?? "admin@fineset.local",
      password: process.env.MASTER_ADMIN_PASSWORD ?? DEV_PASSWORD,
      dashboardPattern: /\/admin\/dashboard/,
    });

    await page.request.post("/api/auth/signout");
    await page.goto("/");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page).not.toHaveURL(/\/admin\/dashboard/);
    await expect(page.getByTestId("portal-shell")).toHaveCount(0);
    await expect(page.getByText(/automation center/i)).toHaveCount(0);
  });
});
