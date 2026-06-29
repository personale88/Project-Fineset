import { test, expect } from "@playwright/test";
import {
  adminEmail,
  adminPassword,
  createSoftDeletedE2eStore,
  waitForDeletedStoreInList,
  fetchAnalyticsCreditsBalance,
  fetchAuditTotal,
  loginAsAdmin,
  openFirstBillingFollowUp,
} from "./helpers/admin";

test.describe("Admin portal API protection", () => {
  test("protected admin APIs reject unauthenticated requests", async ({ browser }) => {
    const context = await browser.newContext();
    const request = context.request;

    const endpoints = [
      "/api/admin/billing/summaries",
      "/api/stores?page=1&pageSize=1",
      "/api/audit?page=1&pageSize=1",
    ];

    for (const path of endpoints) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
    }

    const grantResponse = await request.post("/api/analytics/admin/credits/grant", {
      data: { credits: 1 },
    });
    expect(grantResponse.status()).toBe(401);

    await context.close();
  });
});

test.describe.configure({ mode: "serial" });

test.describe("Admin portal production flows", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("grant credits API increases balance", async ({ page }) => {
    const balanceBefore = await fetchAnalyticsCreditsBalance(page.request);

    const grantResponse = await page.request.post("/api/analytics/admin/credits/grant", {
      data: { credits: 1, description: `e2e-grant-${Date.now()}` },
    });
    expect(grantResponse.ok()).toBeTruthy();

    await expect
      .poll(() => fetchAnalyticsCreditsBalance(page.request))
      .toBe(balanceBefore + 1);
  });

  test("billing follow-up creates a BILLING_FOLLOW_UP_CREATED audit event", async ({ page }) => {
    const before = await fetchAuditTotal(page.request, {
      source: "auth",
      event: "BILLING_FOLLOW_UP_CREATED",
      email: adminEmail,
    });

    const opened = await openFirstBillingFollowUp(page);
    test.skip(!opened, "No billing businesses available for follow-up");

    await page.fill("#follow-up-notes", `E2E billing follow-up ${Date.now()}`);
    await page.getByRole("button", { name: /^Save follow-up$/i }).click();
    await expect(page.getByText("Follow-up saved", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    await expect
      .poll(() =>
        fetchAuditTotal(page.request, {
          source: "auth",
          event: "BILLING_FOLLOW_UP_CREATED",
          email: adminEmail,
        }),
      )
      .toBeGreaterThan(before);
  });

  test("mark paid creates a BILLING_PAYMENT_STATUS_CHANGED audit event", async ({ page }) => {
    const opened = await openFirstBillingFollowUp(page);
    test.skip(!opened, "No billing businesses available for payment status update");

    const before = await fetchAuditTotal(page.request, {
      source: "auth",
      event: "BILLING_PAYMENT_STATUS_CHANGED",
      email: adminEmail,
    });

    await page.getByRole("button", { name: /^Mark as paid$/i }).click();
    await expect(page.getByText("Marked as paid", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    await expect
      .poll(() =>
        fetchAuditTotal(page.request, {
          source: "auth",
          event: "BILLING_PAYMENT_STATUS_CHANGED",
          email: adminEmail,
        }),
      )
      .toBeGreaterThan(before);

    await page.getByRole("button", { name: /^Mark as unpaid$/i }).click();
    await expect(page.getByText("Marked as unpaid", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test("whatsapp reminder creates a BILLING_WHATSAPP_REMINDER audit event", async ({ page }) => {
    await page.goto("/admin/dashboard/billing");
    await expect(page.getByRole("heading", { name: /billing & payments/i })).toBeVisible();

    const whatsAppButton = page
      .getByRole("button", { name: /Send WhatsApp reminder|WhatsApp/i })
      .first();

    test.skip(!(await whatsAppButton.isVisible()), "No WhatsApp reminder button visible");
    test.skip(await whatsAppButton.isDisabled(), "No phone on file for WhatsApp reminder");

    const before = await fetchAuditTotal(page.request, {
      source: "auth",
      event: "BILLING_WHATSAPP_REMINDER",
      email: adminEmail,
    });

    const popupPromise = page.waitForEvent("popup");
    await whatsAppButton.click();
    await expect(page.getByText("WhatsApp opened", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    const popup = await popupPromise;
    await popup.close();

    await expect
      .poll(() =>
        fetchAuditTotal(page.request, {
          source: "auth",
          event: "BILLING_WHATSAPP_REMINDER",
          email: adminEmail,
        }),
      )
      .toBeGreaterThan(before);
  });

  test("store restore rejects wrong password then restores with correct password", async ({
    page,
  }) => {
    const runId = Date.now().toString(36);
    const { storeId, storeName } = await createSoftDeletedE2eStore(page.request, runId);
    await waitForDeletedStoreInList(page.request, storeId, storeName);

    await page.goto("/admin/dashboard/accounts");
    await page.getByRole("tab", { name: /Deleted stores/i }).click();
    await expect(page.getByRole("heading", { name: storeName })).toBeVisible({
      timeout: 15_000,
    });

    const restoreButton = page
      .getByRole("article")
      .filter({ hasText: storeName })
      .getByRole("button", { name: /^Restore$/i });

    await restoreButton.click();
    await expect(page.getByRole("heading", { name: /Restore store/i })).toBeVisible();

    await page.fill("#restore-admin-password", "definitely-wrong-password");
    await page.getByRole("dialog").getByRole("button", { name: /^Restore store$/i }).click();
    await expect(page.getByText(/Incorrect admin password/i)).toBeVisible({ timeout: 10_000 });

    await page.fill("#restore-admin-password", adminPassword);
    await page.getByRole("dialog").getByRole("button", { name: /^Restore store$/i }).click();
    await expect(page.getByText("Store restored", { exact: true }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole("tab", { name: /Client accounts/i }).click();
    await expect(page.getByRole("heading", { name: storeName })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("automation center shows a loading shell on initial visit", async ({ page }) => {
    await page.route("**/api/admin/automation/config", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await route.continue();
    });

    await page.goto("/admin/dashboard/automation", { waitUntil: "commit" });

    await expect(page.getByTestId("automation-center-loading")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByText(/loading automation settings/i)).toBeVisible();

    await expect(page.getByTestId("automation-center-loading")).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(page.getByTestId("automation-run-preview")).toBeVisible();
  });

  test("automation center shows error banner with retry when config API fails", async ({
    page,
  }) => {
    await page.route("**/api/admin/automation/config", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Server error" }),
      }),
    );

    await page.goto("/admin/dashboard/automation");

    await expect(page.getByTestId("automation-center-error")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId("automation-config-error-banner")).toBeVisible();
    await expect(page.getByTestId("automation-config-error-banner")).toContainText(
      /could not load automation settings/i,
    );
    await expect(page.getByRole("button", { name: /^retry$/i })).toBeVisible();
    await expect(page.getByTestId("automation-run-preview")).toHaveCount(0);
  });

  test("automation Run Now is disabled and API blocks live runs when automations are off", async ({
    page,
  }) => {
    const disableResponse = await page.request.patch("/api/admin/automation/config", {
      data: { global: { enabled: false, dryRunMode: false } },
    });
    expect(disableResponse.ok()).toBeTruthy();

    await page.goto("/admin/dashboard/automation");
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();

    await expect(page.getByTestId("automation-run-now")).toBeDisabled();
    await expect(page.getByTestId("automation-run-preview")).toBeEnabled();

    const blockedResponse = await page.request.post("/api/admin/automation/run", {
      data: { dryRun: false },
    });
    expect(blockedResponse.status()).toBe(403);

    const previewResponse = await page.request.post("/api/admin/automation/run", {
      data: { dryRun: true },
    });
    expect(previewResponse.ok()).toBeTruthy();

    await page.request.patch("/api/admin/automation/config", {
      data: { global: { enabled: true } },
    });
  });

  test("automation center mobile scope pills scroll horizontally at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/admin/dashboard/automation");
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();

    const root = page.getByTestId("automation-center-root");
    await expect(root).toBeVisible();

    const scroll = page.getByTestId("automation-scope-scroll");
    await expect(scroll).toBeVisible();

    const assertNoHorizontalOverflow = async () => {
      const overflow = await page.evaluate(() => ({
        docScrollWidth: document.documentElement.scrollWidth,
        docClientWidth: document.documentElement.clientWidth,
      }));
      expect(overflow.docScrollWidth).toBeLessThanOrEqual(overflow.docClientWidth + 1);
    };

    await assertNoHorizontalOverflow();

    const beforeScroll = await scroll.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollLeft: element.scrollLeft,
    }));
    expect(beforeScroll.scrollWidth).toBeGreaterThan(beforeScroll.clientWidth);

    await scroll.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });

    await expect
      .poll(async () => scroll.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(beforeScroll.scrollLeft);

    const scopeTabs = [
      { name: /overview/i, heading: /overview/i },
      { name: /billing cycle/i, heading: /billing cycle/i },
      { name: /invoices/i, heading: /invoices/i },
      { name: /payment reminders/i, heading: /payment reminders/i },
      { name: /follow-ups/i, heading: /follow-ups/i },
      { name: /expiry/i, heading: /expiry/i },
      { name: /monthly reports/i, heading: /monthly reports/i },
      { name: /whatsapp/i, heading: /whatsapp/i },
      { name: /run history/i, heading: /run history/i },
    ] as const;

    for (const tab of scopeTabs) {
      await scroll.getByRole("tab", { name: tab.name }).click();
      await expect(page.getByRole("heading", { name: tab.heading })).toBeVisible();
      await assertNoHorizontalOverflow();
    }
  });

  test("automation center keeps scope tab after reload via ?scope=", async ({ page }) => {
    await page.goto("/admin/dashboard/automation?scope=billingCycle");
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /billing cycle/i })).toBeVisible();
    await expect(page).toHaveURL(/scope=billingCycle/);

    await page.reload();
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /billing cycle/i })).toBeVisible();
    await expect(page).toHaveURL(/scope=billingCycle/);

    const scopePanel = page.getByTestId("automation-scope-panel-desktop");
    await scopePanel.getByRole("tab", { name: /overview master switch/i }).click();
    await expect(scopePanel.getByRole("tab", { name: /overview master switch/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page).not.toHaveURL(/scope=/);

    await scopePanel.getByRole("tab", { name: /billing cycle cycle start/i }).click();
    await expect(page).toHaveURL(/scope=billingCycle/);
    await expect(page.getByRole("heading", { name: /billing cycle/i })).toBeVisible();
  });

  test("automation center restores scope tab on browser back and forward", async ({ page }) => {
    await page.goto("/admin/dashboard/automation");
    await expect(
      page.getByRole("heading", { name: /automation center/i, level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();

    const scopePanel = page.getByTestId("automation-scope-panel-desktop");

    await scopePanel.getByRole("tab", { name: /billing cycle cycle start/i }).click();
    await expect(page).toHaveURL(/scope=billingCycle/);
    await expect(page.getByRole("heading", { name: /billing cycle/i })).toBeVisible();

    await scopePanel.getByRole("tab", { name: /invoices auto-send/i }).click();
    await expect(page).toHaveURL(/scope=invoices/);
    await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/scope=billingCycle/);
    await expect(page.getByRole("heading", { name: /billing cycle/i })).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/scope=/);
    await expect(page.getByRole("heading", { name: /^overview$/i })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/scope=billingCycle/);
    await expect(page.getByRole("heading", { name: /billing cycle/i })).toBeVisible();

    await page.goForward();
    await expect(page).toHaveURL(/scope=invoices/);
    await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();
  });
});
