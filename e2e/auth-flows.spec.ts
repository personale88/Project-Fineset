import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";

type AuthFixtures = {
  skip?: boolean;
  reason?: string;
  resetToken?: string;
  resetEmail?: string;
  resetPassword?: string;
  inviteToken?: string | null;
  inviteEmail?: string | null;
};

function loadFixtures(): AuthFixtures {
  try {
    const raw = readFileSync(resolve(__dirname, ".auth-fixtures.json"), "utf8");
    return JSON.parse(raw) as AuthFixtures;
  } catch {
    return { skip: true, reason: "global-setup did not run" };
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Auth email flows", () => {
  test("sets new password via token link", async ({ page }) => {
    const fixtures = loadFixtures();
    test.skip(Boolean(fixtures.skip || !fixtures.resetToken), fixtures.reason);

    const newPassword = "E2eReset#9test";

    await page.goto(`/reset-password?token=${encodeURIComponent(fixtures.resetToken!)}`);
    await page.fill('[name="password"]', newPassword);
    await page.fill('[name="confirmPassword"]', newPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/reset=success/, { timeout: 15_000 });
  });

  test("submits forgot password and shows success message", async ({ page }) => {
    const fixtures = loadFixtures();
    test.skip(Boolean(fixtures.skip || !fixtures.resetEmail), fixtures.reason);

    await page.goto("/");
    await page.fill('[name="email"]', "staff-a@store-alpha.local");
    await page.getByRole("button", { name: /forgot password/i }).click();

    await expect(
      page.getByText(/If an account exists for that email/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("activates invited account via invite token", async ({ page }) => {
    const fixtures = loadFixtures();
    test.skip(!fixtures.inviteToken || !fixtures.inviteEmail, "no pending invite fixture");

    const newPassword = "E2eInvite#9test";

    await page.goto(
      `/reset-password?token=${encodeURIComponent(fixtures.inviteToken!)}&invite=1`,
    );
    await page.fill('[name="password"]', newPassword);
    await page.fill('[name="confirmPassword"]', newPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/reset=success/, { timeout: 15_000 });
  });
});
