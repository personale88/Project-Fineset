import type { AutomationScope } from "@/components/admin/automation/AutomationSidePanel";

export const AUTOMATION_SCOPE_PANEL_ID = "automation-scope-panel";

export type AutomationScopeTabVariant = "mobile" | "desktop";

export function automationScopeTabId(
  scope: AutomationScope,
  variant: AutomationScopeTabVariant,
): string {
  return `automation-scope-tab-${variant}-${scope}`;
}

export function focusAutomationScopeTab(
  scope: AutomationScope,
  variant: AutomationScopeTabVariant,
): void {
  if (typeof document === "undefined") return;
  document.getElementById(automationScopeTabId(scope, variant))?.focus();
}

export function handleAutomationScopeTabListKeyDown(
  event: React.KeyboardEvent<HTMLElement>,
  options: readonly AutomationScope[],
  activeScope: AutomationScope,
  variant: AutomationScopeTabVariant,
  onChange: (scope: AutomationScope) => void,
  orientation: "horizontal" | "vertical",
): void {
  const currentIndex = options.indexOf(activeScope);
  if (currentIndex < 0) return;

  const previousKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
  const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

  let nextIndex: number | null = null;

  switch (event.key) {
    case previousKey:
      nextIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1;
      break;
    case nextKey:
      nextIndex = currentIndex === options.length - 1 ? 0 : currentIndex + 1;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = options.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  const nextScope = options[nextIndex]!;
  onChange(nextScope);
  focusAutomationScopeTab(nextScope, variant);
}
