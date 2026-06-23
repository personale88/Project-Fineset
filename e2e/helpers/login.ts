import type { Page } from "@playwright/test";

export const DEV_PASSWORD = "FineSet#1dev";

export interface LoginOptions {
  email: string;
  password?: string;
  dashboardPattern: RegExp;
}

/** Sign in via the home page, skipping password when DEV_AUTH_BYPASS hides the field. */
export async function loginWithEmail(
  page: Page,
  { email, password = DEV_PASSWORD, dashboardPattern }: LoginOptions,
): Promise<void> {
  await page.goto("/");
  await page.getByLabel(/^Email$/i).fill(email);

  const passwordField = page.locator('[name="password"]');
  if (await passwordField.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await passwordField.fill(password);
  }

  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(dashboardPattern, { timeout: 15_000 });
}
