"use client";

import { useEffect, useRef } from "react";
import {
  CalendarClock,
  FileText,
  History,
  LayoutDashboard,
  Mail,
  MessageCircle,
  RefreshCw,
  Repeat,
} from "lucide-react";
import { AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS } from "@/lib/automation/automation-center-layout";
import {
  AUTOMATION_SCOPE_PANEL_ID,
  automationScopeTabId,
  handleAutomationScopeTabListKeyDown,
  type AutomationScopeTabVariant,
} from "@/lib/automation/scope-tabs-a11y";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";

export type AutomationScope =
  | "overview"
  | "billingCycle"
  | "invoices"
  | "paymentReminders"
  | "followUps"
  | "expiryRenewal"
  | "monthlyReports"
  | "whatsApp"
  | "history";

type AutomationCopy = Content["admin"]["automation"];

interface ScopeOption {
  key: AutomationScope;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
}

function buildScopeOptions(copy: AutomationCopy): ScopeOption[] {
  return [
    {
      key: "overview",
      label: copy.scope.overview,
      hint: copy.scope.overviewHint,
      icon: LayoutDashboard,
    },
    {
      key: "billingCycle",
      label: copy.scope.billingCycle,
      hint: copy.scope.billingCycleHint,
      icon: CalendarClock,
    },
    {
      key: "invoices",
      label: copy.scope.invoices,
      hint: copy.scope.invoicesHint,
      icon: FileText,
    },
    {
      key: "paymentReminders",
      label: copy.scope.paymentReminders,
      hint: copy.scope.paymentRemindersHint,
      icon: Mail,
    },
    {
      key: "followUps",
      label: copy.scope.followUps,
      hint: copy.scope.followUpsHint,
      icon: Repeat,
    },
    {
      key: "expiryRenewal",
      label: copy.scope.expiryRenewal,
      hint: copy.scope.expiryRenewalHint,
      icon: RefreshCw,
    },
    {
      key: "monthlyReports",
      label: copy.scope.monthlyReports,
      hint: copy.scope.monthlyReportsHint,
      icon: Mail,
    },
    {
      key: "whatsApp",
      label: copy.scope.whatsApp,
      hint: copy.scope.whatsAppHint,
      icon: MessageCircle,
    },
    {
      key: "history",
      label: copy.scope.history,
      hint: copy.scope.historyHint,
      icon: History,
    },
  ];
}

function ScopeNavButton({
  option,
  active,
  onSelect,
  layout,
  variant,
}: {
  option: ScopeOption;
  active: boolean;
  onSelect: () => void;
  layout: "sidebar" | "compact";
  variant: AutomationScopeTabVariant;
}) {
  const Icon = option.icon;
  const tabId = automationScopeTabId(option.key, variant);

  if (layout === "compact") {
    return (
      <button
        type="button"
        id={tabId}
        role="tab"
        aria-selected={active}
        aria-controls={AUTOMATION_SCOPE_PANEL_ID}
        tabIndex={active ? 0 : -1}
        data-scope={option.key}
        onClick={onSelect}
        className={cn(
          "shrink-0 snap-start whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
          active
            ? "bg-brand-gold text-white shadow-sm"
            : "bg-surface-secondary/70 text-text-secondary hover:text-text-primary",
        )}
      >
        {option.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      id={tabId}
      role="tab"
      aria-selected={active}
      aria-controls={AUTOMATION_SCOPE_PANEL_ID}
      tabIndex={active ? 0 : -1}
      data-scope={option.key}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50",
        active
          ? "border-brand-gold/40 bg-brand-gold/10"
          : "border-transparent hover:border-border hover:bg-surface-secondary/60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
          active ? "bg-brand-gold text-white" : "bg-surface-secondary text-text-muted",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-sm font-semibold",
            active ? "text-brand-gold" : "text-text-primary",
          )}
        >
          {option.label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">
          {option.hint}
        </span>
      </span>
    </button>
  );
}

function ScopeReadOnlyHint({ message }: { message: string }) {
  return (
    <p
      className="rounded-lg border border-border bg-surface-secondary/60 px-3 py-2 text-xs leading-relaxed text-text-muted"
      data-testid="automation-scope-read-only-hint"
    >
      {message}
    </p>
  );
}

interface AutomationSidePanelProps {
  copy: AutomationCopy;
  value: AutomationScope;
  onChange: (value: AutomationScope) => void;
  canEdit?: boolean;
  readOnlyHint?: string;
  className?: string;
}

export function AutomationSidePanel({
  copy,
  value,
  onChange,
  canEdit = true,
  readOnlyHint,
  className,
}: AutomationSidePanelProps) {
  const options = buildScopeOptions(copy);
  const scopeKeys = options.map((option) => option.key);
  const showReadOnlyHint = !canEdit && Boolean(readOnlyHint);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const handleMobileTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handleAutomationScopeTabListKeyDown(
      event,
      scopeKeys,
      value,
      "mobile",
      onChange,
      "horizontal",
    );
  };

  const handleDesktopTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    handleAutomationScopeTabListKeyDown(
      event,
      scopeKeys,
      value,
      "desktop",
      onChange,
      "vertical",
    );
  };

  useEffect(() => {
    const container = mobileScrollRef.current;
    if (!container) return;

    const active = container.querySelector<HTMLElement>(`[data-scope="${value}"]`);
    if (!active) return;

    const isFirst = active === container.firstElementChild;
    const isLast = active === container.lastElementChild;
    if (typeof active.scrollIntoView !== "function") return;

    active.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: isFirst ? "start" : isLast ? "end" : "center",
    });
  }, [value]);

  return (
    <div
      className={cn("min-w-0 w-full max-w-full lg:w-72 lg:max-w-none lg:shrink-0", className)}
      data-testid="automation-scope-panel"
    >
      <div
        className="min-w-0 w-full max-w-full space-y-3 lg:hidden"
        data-testid="automation-scope-panel-mobile"
      >
        {showReadOnlyHint ? <ScopeReadOnlyHint message={readOnlyHint!} /> : null}
        <div
          ref={mobileScrollRef}
          className={AUTOMATION_MOBILE_SCOPE_SCROLL_CLASS}
          data-testid="automation-scope-scroll"
          role="tablist"
          aria-label={copy.title}
          aria-orientation="horizontal"
          onKeyDown={handleMobileTabKeyDown}
        >
          {options.map((option) => (
            <ScopeNavButton
              key={option.key}
              option={option}
              active={value === option.key}
              onSelect={() => onChange(option.key)}
              layout="compact"
              variant="mobile"
            />
          ))}
        </div>
      </div>

      <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col">
        <div
          className="sticky top-4 space-y-4 rounded-card border border-border bg-surface-card p-4 shadow-card"
          data-testid="automation-scope-panel-desktop"
        >
          {showReadOnlyHint ? <ScopeReadOnlyHint message={readOnlyHint!} /> : null}
          <div
            className="space-y-1.5"
            role="tablist"
            aria-orientation="vertical"
            aria-label={copy.title}
            onKeyDown={handleDesktopTabKeyDown}
          >
            {options.map((option) => (
              <ScopeNavButton
                key={option.key}
                option={option}
                active={value === option.key}
                onSelect={() => onChange(option.key)}
                layout="sidebar"
                variant="desktop"
              />
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

export { AUTOMATION_SCOPE_PANEL_ID } from "@/lib/automation/scope-tabs-a11y";

export function AutomationResultsHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function scopeMeta(
  copy: AutomationCopy,
  scope: AutomationScope,
): { title: string; description: string } {
  const map: Record<AutomationScope, { title: string; description: string }> = {
    overview: { title: copy.scope.overview, description: copy.scope.overviewHint },
    billingCycle: { title: copy.scope.billingCycle, description: copy.scope.billingCycleHint },
    invoices: { title: copy.scope.invoices, description: copy.scope.invoicesHint },
    paymentReminders: {
      title: copy.scope.paymentReminders,
      description: copy.scope.paymentRemindersHint,
    },
    followUps: { title: copy.scope.followUps, description: copy.scope.followUpsHint },
    expiryRenewal: {
      title: copy.scope.expiryRenewal,
      description: copy.scope.expiryRenewalHint,
    },
    monthlyReports: {
      title: copy.scope.monthlyReports,
      description: copy.scope.monthlyReportsHint,
    },
    whatsApp: { title: copy.scope.whatsApp, description: copy.scope.whatsAppHint },
    history: { title: copy.scope.history, description: copy.scope.historyHint },
  };
  return map[scope];
}
