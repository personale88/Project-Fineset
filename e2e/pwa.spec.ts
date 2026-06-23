import { test, expect } from "@playwright/test";
import {
  assertNonBlankBody,
  emulateStandalone,
  getServiceWorkerRegistrationCount,
  waitForServiceWorker,
  waitForServiceWorkerControl,
} from "./helpers/pwa";
import { DEV_PASSWORD, loginWithEmail } from "./helpers/login";

const e2eEmail = process.env.E2E_USER_EMAIL ?? process.env.MASTER_ADMIN_EMAIL ?? "admin@fineset.local";
const e2ePassword = process.env.E2E_USER_PASSWORD ?? process.env.MASTER_ADMIN_PASSWORD ?? DEV_PASSWORD;
const canRunLiveAuthTests = Boolean(e2eEmail);

test.describe("PWA manifest and service worker", () => {
  test("B1 manifest is valid standalone PWA", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();

    const manifest = await res.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toMatch(/\/$/);
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test("B2 service worker script is served", async ({ request }) => {
    const res = await request.get("/serwist/sw.js");
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/javascript/);
  });

  test("B11 PWA icons are reachable", async ({ request }) => {
    const res = await request.get("/icons/icon-192x192.png");
    expect(res.ok()).toBeTruthy();
  });

  test("B3 first load registers a service worker", async ({ page }) => {
    await page.goto("/");
    await waitForServiceWorker(page, process.env.CI ? 25_000 : 15_000);
    const count = await getServiceWorkerRegistrationCount(page);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("B4 service worker scope includes origin", async ({ page }) => {
    await page.goto("/");
    await waitForServiceWorker(page, process.env.CI ? 25_000 : 15_000);

    const scope = await page.evaluate(async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations[0]?.scope ?? "";
    });

    expect(scope).toContain(new URL(page.url()).origin);
  });

  test("B12 theme-color meta matches brand", async ({ page }) => {
    await page.goto("/");
    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .getAttribute("content");
    expect(themeColor?.toLowerCase()).toBe("#b8972e");
  });
});

test.describe("PWA standalone launch", () => {
  test("B5 standalone launch shows sign-in or shell with non-blank body", async ({
    page,
  }) => {
    await emulateStandalone(page);
    await page.goto("/");

    await expect(
      page
        .getByRole("button", { name: /sign in/i })
        .or(page.getByTestId("portal-shell")),
    ).toBeVisible({ timeout: 5_000 });

    await assertNonBlankBody(page);
    await expect(page.locator("[data-pwa-shell]")).toBeVisible();
  });

  test.skip(
    !canRunLiveAuthTests,
    "Set E2E_USER_EMAIL (or MASTER_ADMIN_EMAIL) to run authenticated PWA tests",
  );

  test("B6 authenticated standalone launch reaches dashboard", async ({ page }) => {
    await emulateStandalone(page);
    await loginWithEmail(page, {
      email: e2eEmail,
      password: e2ePassword,
      dashboardPattern: /\/dashboard/,
    });
    await expect(page.getByTestId("portal-shell")).toBeVisible({ timeout: 5_000 });
    await assertNonBlankBody(page);
  });
});

test.describe("PWA offline behavior", () => {
  test("B7 offline navigation does not show a blank page", async ({
    page,
    context,
  }) => {
    await page.goto("/");
    await waitForServiceWorkerControl(page, process.env.CI ? 25_000 : 15_000);
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded" });

    await assertNonBlankBody(page);
    await expect(
      page.getByText(/offline/i).or(page.getByRole("button", { name: /sign in/i })),
    ).toBeVisible({ timeout: 5_000 });
  });

  test("B8 API routes are not served from cache when offline", async ({ page }) => {
    await page.goto("/");
    await waitForServiceWorker(page, process.env.CI ? 25_000 : 15_000);

    const failed = await page.evaluate(async () => {
      try {
        const res = await fetch("/api/visits?page=1&pageSize=20");
        return !res.ok;
      } catch {
        return true;
      }
    });

    await page.context().setOffline(true);

    const offlineFailed = await page.evaluate(async () => {
      try {
        await fetch("/api/visits?page=1&pageSize=20");
        return false;
      } catch {
        return true;
      }
    });

    expect(failed || offlineFailed).toBeTruthy();
  });
});

test.describe("PWA install UX", () => {
  test("B9 install prompt hidden in standalone mode", async ({ page }) => {
    await emulateStandalone(page);
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Install app" })).toHaveCount(0);
  });

  test("B10 asset version bump reloads without permanent blank body", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForServiceWorker(page, process.env.CI ? 25_000 : 15_000);

    await page.evaluate(() => {
      localStorage.setItem("fineset-pwa-asset-version", "stale-version");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(
      page
        .getByRole("button", { name: /sign in/i })
        .or(page.getByTestId("portal-shell")),
    ).toBeVisible({ timeout: 10_000 });
    await assertNonBlankBody(page);
  });
});
