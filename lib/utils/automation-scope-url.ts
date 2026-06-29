import type { AutomationScope } from "@/components/admin/automation/AutomationSidePanel";

const AUTOMATION_SCOPES: AutomationScope[] = [
  "overview",
  "billingCycle",
  "invoices",
  "paymentReminders",
  "followUps",
  "expiryRenewal",
  "monthlyReports",
  "whatsApp",
  "history",
];

/** Config tabs that expose a per-section Save action (excludes run history). */
export const AUTOMATION_CONFIG_SCOPES = AUTOMATION_SCOPES.filter(
  (scope): scope is Exclude<AutomationScope, "history"> => scope !== "history",
);

export function parseAutomationScope(value: string | null | undefined): AutomationScope {
  if (value && AUTOMATION_SCOPES.includes(value as AutomationScope)) {
    return value as AutomationScope;
  }
  return "overview";
}

export function automationScopeHref(
  pathname: string,
  searchParams: Pick<URLSearchParams, "toString">,
  scope: AutomationScope,
): string {
  const next = new URLSearchParams(searchParams.toString());
  if (scope === "overview") {
    next.delete("scope");
  } else {
    next.set("scope", scope);
  }
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
