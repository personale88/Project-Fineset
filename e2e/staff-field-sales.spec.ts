import { test, expect } from "@playwright/test";
import { dismissPortalOnboarding } from "./helpers/onboarding";
import { DEV_PASSWORD, loginWithEmail } from "./helpers/login";

const e2eEmail = process.env.E2E_USER_EMAIL ?? "staff-a@store-alpha.local";
const e2ePassword = process.env.E2E_USER_PASSWORD ?? DEV_PASSWORD;
const canRunStaffPortalTests = Boolean(e2eEmail);

test.describe("Staff field sales log", () => {
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
      dashboardPattern: /\/staff\/dashboard/,
    });
    await dismissPortalOnboarding(page);
  });

  test("field sales page loads without error boundary", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto("/staff/dashboard/field-sales");
    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /log field sale/i })).toBeVisible({
      timeout: 10_000,
    });
    expect(pageErrors).toEqual([]);
  });

  test("field sales page survives ISO string draft in localStorage", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "fineset-field-sale-draft",
        JSON.stringify({
          startTime: "2026-06-18T04:30:00.000Z",
          endTime: "2026-06-18T06:15:00.000Z",
          activityDate: "2026-06-18T18:30:00.000Z",
          customerName: "Test Customer",
          customerPhone: "9876543210",
        }),
      );
    });

    await page.goto("/staff/dashboard/field-sales");
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /log field sale/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("legacy log-field-sale path redirects to field sales form", async ({ page }) => {
    await page.goto("/staff/dashboard/log-field-sale");
    await expect(page).toHaveURL(/\/staff\/dashboard\/field-sales$/);
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /log field sale/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("Staff field sales log (mobile)", () => {
  test.skip(
    !canRunStaffPortalTests,
    "Set E2E_USER_EMAIL to run staff portal tests",
  );

  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      for (const role of ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"]) {
        localStorage.setItem(`fineset-onboarding-seen:${role}`, "1");
      }
    });
    await loginWithEmail(page, {
      email: e2eEmail,
      password: e2ePassword,
      dashboardPattern: /\/staff\/dashboard/,
    });
    await dismissPortalOnboarding(page);
  });

  test("log sheet navigates to field sales form", async ({ page }) => {
    await page.goto("/staff/dashboard");
    await dismissPortalOnboarding(page);
    await page.getByRole("button", { name: /^log$/i }).click();
    await page.getByRole("link", { name: /field sale/i }).click();
    await expect(page).toHaveURL(/\/staff\/dashboard\/field-sales/);
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /log field sale/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("field sales page shows location verification panel with mocked geolocation", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const position = {
        coords: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracy: 12,
        },
        timestamp: Date.now(),
      };
      Object.defineProperty(navigator, "geolocation", {
        configurable: true,
        value: {
          getCurrentPosition: (
            success: PositionCallback,
            _error?: PositionErrorCallback,
          ) => {
            success(position as GeolocationPosition);
          },
        },
      });
    });

    await page.goto("/staff/dashboard/field-sales");
    await expect(page.getByText(/location verification/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/location detected successfully/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("field sales wizard advances through activity step with draft", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.addInitScript(() => {
      localStorage.setItem(
        "fineset-field-sale-draft",
        JSON.stringify({
          startTime: "2026-06-18T04:30:00.000Z",
          endTime: "2026-06-18T06:15:00.000Z",
          activityDate: "2026-06-18T18:30:00.000Z",
          customerName: "Test Customer",
          customerPhone: "9876543210",
        }),
      );
    });

    await page.goto("/staff/dashboard/field-sales");
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /customer details/i })).toBeVisible();
    await page.getByRole("button", { name: /^next$/i }).click();
    await expect(page.getByRole("heading", { name: /field activity/i })).toBeVisible();
    await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
});
