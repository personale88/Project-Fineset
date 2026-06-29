import { test, expect } from "@playwright/test";
import { DEV_PASSWORD, loginWithEmail } from "./helpers/login";
import { devPortalUsersReady } from "./helpers/fixtures";

const portalUsersReady = devPortalUsersReady();

const PORTAL_USERS = [
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
  {
    label: "master admin",
    email: process.env.E2E_USER_EMAIL ?? process.env.MASTER_ADMIN_EMAIL ?? "admin@fineset.local",
    password:
      process.env.E2E_USER_PASSWORD ??
      process.env.MASTER_ADMIN_PASSWORD ??
      DEV_PASSWORD,
    dashboard: /\/admin\/dashboard/,
  },
] as const;

const PORTAL_HEADER_EXPECTATIONS: Record<
  (typeof PORTAL_USERS)[number]["label"],
  { portalType: string }
> = {
  staff: { portalType: "Staff" },
  "store manager": { portalType: "Store Manager" },
  "business owner": { portalType: "Business Owner" },
  "master admin": { portalType: "Master Admin" },
};

for (const user of PORTAL_USERS) {
  test(`login as ${user.label} reaches dashboard`, async ({ page }) => {
    test.skip(
      user.label !== "master admin" && !portalUsersReady,
      "Run npm run db:seed (Store Alpha) so E2E dev portal users exist",
    );

    await loginWithEmail(page, {
      email: user.email,
      password: "password" in user ? user.password : DEV_PASSWORD,
      dashboardPattern: user.dashboard,
    });

    await expect(page.getByTestId("portal-shell")).toBeVisible();
    await expect(page.getByTestId("portal-brand-title")).toHaveText("My Store");
    await expect(page.getByTestId("portal-type-label")).toHaveText(
      PORTAL_HEADER_EXPECTATIONS[user.label].portalType,
    );
  });
}
