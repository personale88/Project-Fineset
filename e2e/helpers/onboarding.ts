import type { Page } from "@playwright/test";

/** Dismiss multi-step role onboarding if it appears after login. */
export async function dismissPortalOnboarding(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog");
  if (!(await dialog.isVisible({ timeout: 2_000 }).catch(() => false))) {
    return;
  }

  const gotIt = page.getByRole("button", { name: /^Got it$/i });
  const next = page.getByRole("button", { name: /^Next$/i });

  for (let step = 0; step < 5; step += 1) {
    if (await gotIt.isVisible({ timeout: 500 }).catch(() => false)) {
      await gotIt.click();
      await dialog.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => undefined);
      return;
    }

    if (await next.isVisible({ timeout: 500 }).catch(() => false)) {
      await next.click();
      continue;
    }

    break;
  }
}
