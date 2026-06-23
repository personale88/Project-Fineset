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
});
