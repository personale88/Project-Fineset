"use client";

import { Building2, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";

export type AccountsScope = "clients" | "internal" | "deleted";

type AccountsCopy = Content["admin"]["accounts"];

interface ScopeOption {
  key: AccountsScope;
  label: string;
  hint: string;
  icon: typeof Building2;
}

interface AccountsSidePanelProps {
  copy: AccountsCopy;
  value: AccountsScope;
  onChange: (value: AccountsScope) => void;
  showInternal: boolean;
  className?: string;
}

function buildScopeOptions(copy: AccountsCopy, showInternal: boolean): ScopeOption[] {
  return [
    {
      key: "clients",
      label: copy.scope.clients,
      hint: copy.scope.clientsHint,
      icon: Building2,
    },
    ...(showInternal
      ? [
          {
            key: "internal" as const,
            label: copy.scope.internal,
            hint: copy.scope.internalHint,
            icon: Users,
          },
        ]
      : []),
    {
      key: "deleted",
      label: copy.scope.deleted,
      hint: copy.scope.deletedHint,
      icon: Trash2,
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
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">{option.hint}</span>
      </span>
    </button>
  );
}

export function AccountsSidePanel({
  copy,
  value,
  onChange,
  showInternal,
  className,
}: AccountsSidePanelProps) {
  const options = buildScopeOptions(copy, showInternal);

  return (
    <>
      {/* Mobile: compact horizontal tabs */}
      <div
        className={cn(
          "flex gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          className,
        )}
        role="tablist"
        aria-label={copy.scope.label}
      >
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

      {/* Desktop: sticky sidebar */}
      <aside
        className={cn(
          "hidden lg:flex lg:w-[260px] lg:shrink-0 lg:flex-col lg:gap-4",
          className,
        )}
      >
        <div
          className="sticky top-4 space-y-4 rounded-card border border-border bg-surface-card p-4 shadow-card"
          role="tablist"
          aria-label={copy.scope.label}
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
              {copy.scope.panelTitle}
            </p>
          </div>
          <div className="space-y-1.5">
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
      </aside>
    </>
  );
}

export function AccountsResultsHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function scopeMeta(
  copy: AccountsCopy,
  scope: AccountsScope,
): { title: string; description: string } {
  switch (scope) {
    case "clients":
      return { title: copy.scope.clients, description: copy.scope.clientsHint };
    case "internal":
      return { title: copy.scope.internal, description: copy.scope.internalHint };
    case "deleted":
      return { title: copy.scope.deleted, description: copy.scope.deletedHint };
  }
}
