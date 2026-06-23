"use client";

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
}: {
  option: ScopeOption;
  active: boolean;
  onSelect: () => void;
  layout: "sidebar" | "compact";
}) {
  const Icon = option.icon;

  if (layout === "compact") {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onSelect}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
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
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
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

interface AutomationSidePanelProps {
  copy: AutomationCopy;
  value: AutomationScope;
  onChange: (value: AutomationScope) => void;
  className?: string;
}

export function AutomationSidePanel({
  copy,
  value,
  onChange,
  className,
}: AutomationSidePanelProps) {
  const options = buildScopeOptions(copy);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {options.map((option) => (
          <ScopeNavButton
            key={option.key}
            option={option}
            active={value === option.key}
            onSelect={() => onChange(option.key)}
            layout="compact"
          />
        ))}
      </div>
      <div
        className="hidden w-full shrink-0 flex-col gap-1 lg:flex lg:w-72"
        role="tablist"
        aria-orientation="vertical"
      >
        {options.map((option) => (
          <ScopeNavButton
            key={option.key}
            option={option}
            active={value === option.key}
            onSelect={() => onChange(option.key)}
            layout="sidebar"
          />
        ))}
      </div>
    </div>
  );
}

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
      {action ? <div className="shrink-0">{action}</div> : null}
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
