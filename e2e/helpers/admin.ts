import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { loginWithEmail } from "./login";

export const DEV_PASSWORD = "FineSet#1dev";

export const adminEmail =
  process.env.MASTER_ADMIN_EMAIL ??
  process.env.E2E_USER_EMAIL ??
  "admin@fineset.local";
export const adminPassword =
  process.env.MASTER_ADMIN_PASSWORD ??
  process.env.E2E_USER_PASSWORD ??
  DEV_PASSWORD;

export async function dismissAdminOnboarding(page: Page): Promise<void> {
  const gotIt = page.getByRole("button", { name: /^Got it$/i });
  try {
    await gotIt.click({ timeout: 2_000 });
  } catch {
    // Onboarding modal not shown for this session.
  }
}

export async function loginAsAdmin(page: Page): Promise<void> {
  try {
    await loginWithEmail(page, {
      email: adminEmail,
      password: adminPassword,
      dashboardPattern: /\/admin\/dashboard/,
    });
  } catch {
    const loginError = page.getByRole("alert");
    const message = (await loginError.textContent())?.trim();
    throw new Error(
      message
        ? `Admin login failed for ${adminEmail}: ${message}`
        : `Admin login failed for ${adminEmail}. Ensure MASTER_ADMIN_EMAIL exists (run npm run auth:bootstrap).`,
    );
  }

  await dismissAdminOnboarding(page);
}

type AuditQuery = {
  page?: number;
  pageSize?: number;
  source?: "auth" | "analytics" | "all";
  event?: string;
  email?: string;
};

export async function fetchAuditTotal(
  request: APIRequestContext,
  query: AuditQuery = {},
): Promise<number> {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 1));
  params.set("pageSize", String(query.pageSize ?? 25));
  if (query.source) params.set("source", query.source);
  if (query.event) params.set("event", query.event);
  if (query.email) params.set("email", query.email);

  const response = await request.get(`/api/audit?${params.toString()}`);
  expect(response.ok()).toBeTruthy();
  const json = (await response.json()) as { total: number };
  return json.total;
}

export async function fetchAnalyticsCreditsBalance(
  request: APIRequestContext,
): Promise<number> {
  const response = await request.get("/api/analytics/admin/credits");
  expect(response.ok()).toBeTruthy();
  const json = (await response.json()) as { balanceCredits: number };
  return json.balanceCredits;
}

export async function createSoftDeletedE2eStore(
  request: APIRequestContext,
  runId: string,
): Promise<{ storeId: string; storeName: string }> {
  const storeName = `E2E Restore ${runId}`;
  const ownerEmail = `e2e-restore-${runId}@test.local`;

  const createResponse = await request.post("/api/stores", {
    data: {
      name: storeName,
      category: "JEWELRY",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      businessOwnerName: "E2E Restore Owner",
      businessOwnerEmail: ownerEmail,
      password: adminPassword,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()) as {
    store: { id: string; name: string };
  };

  const deleteResponse = await request.delete(`/api/stores/${created.store.id}`, {
    data: {
      storeNameConfirm: storeName,
      password: adminPassword,
    },
  });
  if (!deleteResponse.ok()) {
    const body = await deleteResponse.text();
    throw new Error(`Soft delete failed (${deleteResponse.status()}): ${body}`);
  }

  const deleted = (await deleteResponse.json()) as { id: string; deletedAt: string };
  if (deleted.id !== created.store.id || !deleted.deletedAt) {
    throw new Error(`Soft delete response missing deletedAt for store ${created.store.id}`);
  }

  return { storeId: created.store.id, storeName };
}

export async function waitForDeletedStoreInList(
  request: APIRequestContext,
  storeId: string,
  storeName: string,
): Promise<void> {
  const search = encodeURIComponent(storeName);
  await expect
    .poll(async () => {
      const response = await request.get(
        `/api/stores?page=1&pageSize=10&includeDeleted=true&search=${search}`,
      );
      if (!response.ok()) return false;
      const json = (await response.json()) as {
        data: Array<{ id: string; deletedAt: string | null }>;
      };
      return json.data.some((store) => store.id === storeId && Boolean(store.deletedAt));
    })
    .toBe(true);
}

export async function openFirstBillingFollowUp(page: Page): Promise<boolean> {
  await page.goto("/admin/dashboard/billing");
  await expect(page.getByRole("heading", { name: /billing & payments/i })).toBeVisible();

  const followUpButton = page
    .getByRole("button", { name: /^(Follow up|Follow-up history)$/i })
    .first();

  if (!(await followUpButton.isVisible())) {
    return false;
  }

  await followUpButton.click();
  await expect(page.getByRole("button", { name: /^Save follow-up$/i })).toBeVisible({
    timeout: 10_000,
  });
  return true;
}

