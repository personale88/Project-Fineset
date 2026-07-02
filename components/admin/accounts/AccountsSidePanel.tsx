"use client";

import { useEffect, useRef } from "react";
import { Building2, Trash2, Users } from "lucide-react";
import { PortalChildSidePanel } from "@/components/layout/PortalChildSidePanel";
import { ADMIN_SCOPED_MOBILE_SCOPE_NAV_CLASS } from "@/lib/admin/admin-scoped-page-layout";
import {
  handleScopeTabListKeyDown,
  scopeTabId,
} from "@/lib/admin/scope-tabs-a11y";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";

export type AccountsScope = "clients" | "internal" | "deleted";

type AccountsCopy = Content["admin"]["accounts"];

const ACCOUNTS_SCOPE_PREFIX = "accounts";

interface ScopeOption {
  key: AccountsScope;
  label: string;
  hint: string;
  icon: typeof Building2;
}

interface AccountsMobileScopeNavProps {
  copy: AccountsCopy;
  value: AccountsScope;
  onChange: (value: AccountsScope) => void;
  showInternal: boolean;
  className?: string;
}

interface AccountsSidePanelProps {
  copy: AccountsCopy;
  value: AccountsScope;
  onChange: (value: AccountsScope) => void;
  showInternal: boolean;
  pageMeta?: string;
  className?: string;
  /** Dock flush to the primary side nav on large screens. */
  docked?: boolean;
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
  id,
}: {
  option: ScopeOption;
  active: boolean;
  onSelect: () => void;
  layout: "sidebar" | "compact";
  id?: string;
}) {
  const Icon = option.icon;

  if (layout === "compact") {
    return (
      <button
        id={id}
        type="button"
        role="tab"
        aria-selected={active}
        data-scope={option.key}
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
      id={id}
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
            active ? "text-brand-gold" : "text-text-secondary",
          )}
        >
          {option.label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">{option.hint}</span>
      </span>
    </button>
  );
}

/** Horizontal scope tabs for mobile — pinned above the scrolling accounts card. */
export function AccountsMobileScopeNav({
  copy,
  value,
  onChange,
  showInternal,
  className,
}: AccountsMobileScopeNavProps) {
  const options = buildScopeOptions(copy, showInternal);
  const scopeKeys = options.map((option) => option.key);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(`[data-scope="${value}"]`);
    if (!active || typeof active.scrollIntoView !== "function") return;
    active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [value]);

  return (
    <div
      ref={scrollRef}
      className={cn(ADMIN_SCOPED_MOBILE_SCOPE_NAV_CLASS, className)}
      data-testid="accounts-scope-scroll"
      role="tablist"
      aria-label={copy.scope.label}
      aria-orientation="horizontal"
      onKeyDown={(event) =>
        handleScopeTabListKeyDown(
          event,
          scopeKeys,
          value,
          ACCOUNTS_SCOPE_PREFIX,
          "mobile",
          onChange,
          "horizontal",
        )
      }
    >
      {options.map((option) => (
        <ScopeNavButton
          key={option.key}
          id={scopeTabId(ACCOUNTS_SCOPE_PREFIX, option.key, "mobile")}
          option={option}
          active={value === option.key}
          onSelect={() => onChange(option.key)}
          layout="compact"
        />
      ))}
    </div>
  );
}

/** Desktop child side panel for accounts scopes. */
export function AccountsSidePanel({
  copy,
  value,
  onChange,
  showInternal,
  pageMeta,
  className,
  docked = true,
}: AccountsSidePanelProps) {
  const options = buildScopeOptions(copy, showInternal);
  const scopeKeys = options.map((option) => option.key);

  const sidebarTabList = (
    <div
      className="flex flex-col gap-1"
      role="tablist"
      aria-label={copy.scope.label}
      aria-orientation="vertical"
      onKeyDown={(event) =>
        handleScopeTabListKeyDown(
          event,
          scopeKeys,
          value,
          ACCOUNTS_SCOPE_PREFIX,
          "desktop",
          onChange,
          "vertical",
        )
      }
    >
      {options.map((option) => (
        <ScopeNavButton
          key={option.key}
          id={scopeTabId(ACCOUNTS_SCOPE_PREFIX, option.key, "desktop")}
          option={option}
          active={value === option.key}
          onSelect={() => onChange(option.key)}
          layout="sidebar"
        />
      ))}
    </div>
  );

  return (
    <div className={className}>
      {docked ? (
        <PortalChildSidePanel
          aria-label={copy.scope.label}
          pageTitle={copy.title}
          pageSubtitle={copy.subtitle}
          pageMeta={pageMeta}
        >
          <div className="px-2 py-4">{sidebarTabList}</div>
        </PortalChildSidePanel>
      ) : (
        <aside className="hidden lg:block lg:w-72">{sidebarTabList}</aside>
      )}
    </div>
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
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 hidden text-sm text-text-muted lg:block">{description}</p>
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
