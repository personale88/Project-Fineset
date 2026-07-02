import { test, expect, type Page } from "@playwright/test";
import { loginAsAdmin } from "./helpers/admin";

type Viewport = { name: string; width: number; height: number };

const VIEWPORTS: Viewport[] = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1280, height: 900 },
];

const ADMIN_ROUTES = [
  { path: "/admin/dashboard", label: "Portfolio overview" },
  { path: "/admin/dashboard/accounts", label: "Accounts" },
  { path: "/admin/dashboard/analytics", label: "Analytics" },
  { path: "/admin/dashboard/billing", label: "Billing" },
  { path: "/admin/dashboard/automation", label: "Automation overview" },
  { path: "/admin/dashboard/automation?scope=billingCycle", label: "Automation billing cycle" },
  { path: "/admin/dashboard/automation?scope=history", label: "Automation history" },
  { path: "/admin/dashboard/settings", label: "Settings" },
] as const;

interface PageIssue {
  viewport: string;
  route: string;
  label: string;
  issues: string[];
}

const auditResults: PageIssue[] = [];

async function canScrollElement(page: Page, selector: string): Promise<boolean | null> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) return null;
    const before = el.scrollTop;
    el.scrollTop = before + 120;
    const moved = el.scrollTop > before;
    el.scrollTop = before;
    return moved || el.scrollHeight <= el.clientHeight + 8;
  }, selector);
}

async function collectPageIssues(
  page: Page,
  viewport: Viewport,
  route: string,
): Promise<string[]> {
  const issues: string[] = [];

  const response = await page.goto(route, { waitUntil: "networkidle" });
  if (!response || !response.ok()) {
    issues.push(`HTTP ${response?.status() ?? "no response"} on navigation`);
  }

  await page.waitForTimeout(500);

  if (!(await page.getByTestId("portal-shell").count())) {
    issues.push("Missing portal shell (page may have crashed)");
    return issues;
  }

  const layoutMetrics = await page.evaluate(() => {
    const shellEl = document.querySelector('[data-testid="portal-shell"]');
    const docEl = document.documentElement;

    const horizontalOverflow =
      docEl.scrollWidth > docEl.clientWidth + 2 ||
      (shellEl?.scrollWidth ?? 0) > (shellEl?.clientWidth ?? 0) + 2;

    const bottomNav = document.querySelector('nav[aria-label="Admin navigation"]');
    const bottomNavRect = bottomNav?.getBoundingClientRect();
    const bottomNavVisible =
      bottomNavRect != null &&
      bottomNavRect.height > 0 &&
      bottomNavRect.width > 0 &&
      window.getComputedStyle(bottomNav!).display !== "none";

    const lgSideNav = Array.from(shellEl?.querySelectorAll(".fixed.inset-y-0") ?? []).find(
      (el) => el.getBoundingClientRect().width > 0,
    );
    const lgSideNavRect = lgSideNav?.getBoundingClientRect();

    const truncatedLabels = Array.from(document.querySelectorAll("p, span, button, a, h2, h3"))
      .filter((el) => {
        const text = (el.textContent ?? "").trim();
        if (!text || text.length < 5) return false;
        const style = window.getComputedStyle(el);
        if (style.textOverflow !== "ellipsis" && !text.endsWith("…") && !text.endsWith("...")) {
          return false;
        }
        return el.scrollWidth > el.clientWidth + 2;
      })
      .slice(0, 6)
      .map((el) => (el.textContent ?? "").trim());

    const contentHiddenUnderBottomNav = (() => {
      if (!bottomNavRect) return false;
      const interactive = Array.from(
        document.querySelectorAll("button, a, input, select, textarea"),
      ).filter((el) => {
        if (bottomNav?.contains(el)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 || rect.width === 0) return false;
        return rect.bottom > bottomNavRect.top + 2 && rect.bottom <= window.innerHeight;
      });
      return interactive.length > 0;
    })();

    return {
      horizontalOverflow,
      lgSideNavWidth: lgSideNavRect?.width ?? 0,
      bottomNavVisible,
      truncatedLabels,
      contentHiddenUnderBottomNav,
    };
  });

  if (layoutMetrics.horizontalOverflow) {
    issues.push("Horizontal page overflow detected");
  }

  if (viewport.name === "mobile") {
    if (layoutMetrics.lgSideNavWidth > 60) {
      issues.push(
        `Desktop icon rail visible on mobile (${Math.round(layoutMetrics.lgSideNavWidth)}px)`,
      );
    }
    if (route.includes("/analytics") && layoutMetrics.bottomNavVisible) {
      issues.push("Bottom nav overlaps Analytics composer (should be hidden)");
    }
    if (!route.includes("/analytics") && !layoutMetrics.bottomNavVisible) {
      issues.push("Mobile bottom nav not visible");
    }
    if (layoutMetrics.contentHiddenUnderBottomNav && !route.includes("/analytics")) {
      issues.push("Interactive controls may sit under the bottom nav bar");
    }
  }

  if (viewport.name === "desktop") {
    if (layoutMetrics.bottomNavVisible) {
      issues.push("Mobile bottom nav visible on desktop");
    }
    if (layoutMetrics.lgSideNavWidth < 60) {
      issues.push("Desktop side nav rail not visible");
    }
    const childPanel = page.getByTestId("portal-child-side-panel");
    if (
      (route.includes("/automation") ||
        route.includes("/settings") ||
        route.includes("/accounts") ||
        route.includes("/analytics")) &&
      (await childPanel.count()) === 0
    ) {
      issues.push("Child side panel missing on desktop for scoped route");
    }
  }

  if (route.includes("/automation")) {
    const scrollOk = await canScrollElement(page, '[data-testid="automation-center-scroll"]');
    if (scrollOk === null && !route.includes("history")) {
      issues.push("Automation internal scroll container missing");
    } else if (scrollOk === false) {
      issues.push("Automation scroll container cannot scroll (content clipped)");
    }
  }

  if (
    route.includes("/settings") ||
    route.includes("/accounts") ||
    route.includes("/billing") ||
    route === "/admin/dashboard"
  ) {
    const adminScrollOk = await canScrollElement(page, '[data-testid="admin-dashboard-content"]');
    if (adminScrollOk === false) {
      issues.push("Main admin content area cannot scroll (content may be clipped)");
    }
  }

  if (layoutMetrics.truncatedLabels.length > 0) {
    issues.push(
      `Ellipsis-truncated text: ${layoutMetrics.truncatedLabels.join(" | ")}`,
    );
  }

  if ((await page.getByRole("button", { name: /sign out/i }).count()) === 0) {
    issues.push("Sign out control not found");
  }

  return issues;
}

async function collectInteractionIssues(page: Page): Promise<string[]> {
  const issues: string[] = [];
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/admin/dashboard/automation?scope=whatsApp", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(400);

  const automationScrollBefore = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="automation-center-scroll"]') as HTMLElement;
    return el?.scrollTop ?? 0;
  });
  await page.getByTestId("automation-center-scroll").evaluate((el) => {
    el.scrollTop = 500;
  });
  const automationScrollAfter = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="automation-center-scroll"]') as HTMLElement;
    return el?.scrollTop ?? 0;
  });
  if (automationScrollAfter <= automationScrollBefore) {
    issues.push("Automation monthlyReports tab: scroll position did not change on mobile");
  }

  await page.goto("/admin/dashboard/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const settingsScrollOk = await canScrollElement(page, '[data-testid="admin-dashboard-content"]');
  if (settingsScrollOk === false) {
    issues.push("Settings page: main content cannot scroll on mobile");
  }

  await page.goto("/admin/dashboard", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const moreButton = page.getByRole("button", { name: /^more$/i });
  if ((await moreButton.count()) === 0) {
    issues.push("Mobile More button missing in bottom nav");
  } else {
    await moreButton.click();
    await page.waitForTimeout(300);
    const sheet = page.getByText(/more admin tools/i);
    if ((await sheet.count()) === 0) {
      issues.push("Mobile More sheet does not open");
    } else {
      const billingLink = page.getByRole("link", { name: /billing/i });
      if ((await billingLink.count()) === 0) {
        issues.push("Billing link missing from More sheet");
      }
    }
    await page.keyboard.press("Escape");
  }

  await page.goto("/admin/dashboard/analytics", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const bottomNavOnAnalytics = await page.evaluate(() => {
    const bottomNav = document.querySelector('nav[aria-label="Admin navigation"]');
    const rect = bottomNav?.getBoundingClientRect();
    return rect != null && rect.height > 0;
  });
  if (bottomNavOnAnalytics) {
    issues.push("Analytics still shows bottom nav on mobile");
  }

  const composer = page.locator("[data-analytics-chat-composer], textarea").first();
  if (await composer.count()) {
    const composerBox = await composer.boundingBox();
    const viewportHeight = page.viewportSize()?.height ?? 844;
    if (composerBox && composerBox.y + composerBox.height > viewportHeight - 8) {
      issues.push("Analytics composer may be clipped below viewport on mobile");
    }
  }

  return issues;
}

test.describe.configure({ mode: "serial" });

test.describe("Admin panel live audit", () => {
  test.setTimeout(240_000);

  test("audit all admin routes", async ({ page }) => {
    await loginAsAdmin(page);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of ADMIN_ROUTES) {
        const issues = await collectPageIssues(page, viewport, route.path);

        for (const err of consoleErrors.splice(0)) {
          if (
            !err.includes("favicon") &&
            !err.includes("404") &&
            !err.includes("Failed to load resource")
          ) {
            issues.push(`Console: ${err.slice(0, 180)}`);
          }
        }

        auditResults.push({
          viewport: viewport.name,
          route: route.path,
          label: route.label,
          issues,
        });
      }
    }

    const interactionIssues = await collectInteractionIssues(page);
    if (interactionIssues.length > 0) {
      auditResults.push({
        viewport: "mobile",
        route: "(interaction checks)",
        label: "Mobile interactions",
        issues: interactionIssues,
      });
    }

    const withIssues = auditResults.filter((r) => r.issues.length > 0);

    console.log("\n========== ADMIN PANEL AUDIT REPORT ==========\n");
    if (withIssues.length === 0) {
      console.log("No issues detected across all routes and viewports.\n");
    } else {
      for (const result of withIssues) {
        console.log(`[${result.viewport.toUpperCase()}] ${result.label}`);
        console.log(`  Route: ${result.route}`);
        for (const issue of result.issues) {
          console.log(`  • ${issue}`);
        }
        console.log("");
      }
      console.log(`Total: ${withIssues.length} / ${auditResults.length} checks with issues\n`);
    }

    console.log("========== PASSED CHECKS ==========");
    for (const result of auditResults.filter((r) => r.issues.length === 0)) {
      console.log(`✓ [${result.viewport}] ${result.label}`);
    }
    console.log("");

    // Report-only audit — do not fail CI on UX findings
    if (withIssues.length > 0) {
      test.info().annotations.push({
        type: "audit-issues",
        description: `${withIssues.length} issue(s) found — see stdout`,
      });
    }
  });
});
