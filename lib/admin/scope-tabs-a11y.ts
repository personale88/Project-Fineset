export type ScopeTabVariant = "mobile" | "desktop";

export function scopeTabId(
  prefix: string,
  scope: string,
  variant: ScopeTabVariant,
): string {
  return `${prefix}-scope-tab-${variant}-${scope}`;
}

export function focusScopeTab(
  prefix: string,
  scope: string,
  variant: ScopeTabVariant,
): void {
  if (typeof document === "undefined") return;
  document.getElementById(scopeTabId(prefix, scope, variant))?.focus();
}

export function handleScopeTabListKeyDown<T extends string>(
  event: React.KeyboardEvent<HTMLElement>,
  options: readonly T[],
  activeScope: T,
  prefix: string,
  variant: ScopeTabVariant,
  onChange: (scope: T) => void,
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
  focusScopeTab(prefix, nextScope, variant);
}
