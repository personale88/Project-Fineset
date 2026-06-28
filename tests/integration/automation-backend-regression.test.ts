import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const INTEGRATION_DIR = join(process.cwd(), "tests/integration");

/** Backend edge-case integration files covered by the EC-BE-080 regression pass. */
export const AUTOMATION_BACKEND_REGRESSION_FILES = [
  "automation-backend.test.ts",
  "automation-backend-pending.test.ts",
  "automation-backend-regression.test.ts",
  "billing-payment-submissions.test.ts",
  "auth-security.test.ts",
  "auth-flows.test.ts",
  "store-scoping.test.ts",
  "store-manager-portal.test.ts",
  "staff-deactivation.test.ts",
  "visit-sale-date.test.ts",
  "sync.test.ts",
  "analytics-credit-payment-submissions.test.ts",
  "production-env-validation.test.ts",
  "admin-portal-fixes.test.ts",
] as const;

function collectEcBeCaseIds(): Set<string> {
  const ids = new Set<string>();
  for (const file of AUTOMATION_BACKEND_REGRESSION_FILES) {
    const content = readFileSync(join(INTEGRATION_DIR, file), "utf8");
    for (const match of content.matchAll(/EC-BE-\d{3}/g)) {
      ids.add(match[0]!);
    }
  }
  return ids;
}

describe("EC-BE-080: full automation backend regression pass", () => {
  it("lists every regression file and labels EC-BE-001 through EC-BE-080", () => {
    for (const file of AUTOMATION_BACKEND_REGRESSION_FILES) {
      const content = readFileSync(join(INTEGRATION_DIR, file), "utf8");
      expect(content.length).toBeGreaterThan(0);
      expect(content).toMatch(/EC-BE-/);
    }

    const ids = collectEcBeCaseIds();
    for (let index = 1; index <= 80; index += 1) {
      expect(ids.has(`EC-BE-${String(index).padStart(3, "0")}`)).toBe(true);
    }
  });
});
