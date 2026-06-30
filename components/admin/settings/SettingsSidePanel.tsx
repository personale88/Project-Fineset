"use client";

import { useEffect, useRef } from "react";
import {
  BarChart3,
  CreditCard,
  FolderTree,
  Plug,
  Settings2,
  Shield,
  Sparkles,
} from "lucide-react";
import { PortalChildSidePanel } from "@/components/layout/PortalChildSidePanel";
import { ADMIN_SCOPED_MOBILE_SCOPE_NAV_CLASS } from "@/lib/admin/admin-scoped-page-layout";
import {
  focusScopeTab,
  handleScopeTabListKeyDown,
  scopeTabId,
} from "@/lib/admin/scope-tabs-a11y";
import { cn } from "@/lib/utils";
import type { Content } from "@/content/en";

export type SettingsScope =
  | "general"
  | "billing"
  | "security"
  | "analytics"
  | "onboarding"
  | "categories"
  | "integrations";

type SettingsCopy = Content["admin"]["settings"];

const SETTINGS_SCOPE_PREFIX = "settings";

interface ScopeOption {
  key: SettingsScope;
  label: string;
  hint: string;
  icon: typeof Settings2;
}

function buildScopeOptions(copy: SettingsCopy): ScopeOption[] {
  return [
    {
      key: "general",
      label: copy.scope.general,
      hint: copy.scope.generalHint,
      icon: Settings2,
    },
    {
      key: "billing",
      label: copy.scope.billing,
      hint: copy.scope.billingHint,
      icon: CreditCard,
    },
    {
      key: "security",
      label: copy.scope.security,
      hint: copy.scope.securityHint,
      icon: Shield,
    },
    {
      key: "analytics",
      label: copy.scope.analytics,
      hint: copy.scope.analyticsHint,
      icon: BarChart3,
    },
    {
      key: "onboarding",
      label: copy.scope.onboarding,
      hint: copy.scope.onboardingHint,
      icon: Sparkles,
    },
    {
      key: "categories",
      label: copy.scope.categories,
      hint: copy.scope.categoriesHint,
      icon: FolderTree,
    },
    {
      key: "integrations",
      label: copy.scope.integrations,
      hint: copy.scope.integrationsHint,
      icon: Plug,
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
        <span className="mt-0.5 block text-xs leading-snug text-text-muted">
          {option.hint}
        </span>
      </span>
    </button>
  );
}

interface SettingsMobileScopeNavProps {
  copy: SettingsCopy;
  value: SettingsScope;
  onChange: (value: SettingsScope) => void;
  className?: string;
}

/** Horizontal scope tabs for mobile — pinned above the scrolling settings card. */
export function SettingsMobileScopeNav({
  copy,
  value,
  onChange,
  className,
}: SettingsMobileScopeNavProps) {
  const options = buildScopeOptions(copy);
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
      data-testid="settings-scope-scroll"
      role="tablist"
      aria-label={copy.title}
      aria-orientation="horizontal"
      onKeyDown={(event) =>
        handleScopeTabListKeyDown(
          event,
          scopeKeys,
          value,
          SETTINGS_SCOPE_PREFIX,
          "mobile",
          onChange,
          "horizontal",
        )
      }
    >
      {options.map((option) => (
        <ScopeNavButton
          key={option.key}
          id={scopeTabId(SETTINGS_SCOPE_PREFIX, option.key, "mobile")}
          option={option}
          active={value === option.key}
          onSelect={() => onChange(option.key)}
          layout="compact"
        />
      ))}
    </div>
  );
}

interface SettingsSidePanelProps {
  copy: SettingsCopy;
  value: SettingsScope;
  onChange: (value: SettingsScope) => void;
  className?: string;
  /** Dock flush to the primary side nav on large screens. */
  docked?: boolean;
}

/** Desktop child side panel for settings scopes. */
export function SettingsSidePanel({
  copy,
  value,
  onChange,
  className,
  docked = true,
}: SettingsSidePanelProps) {
  const options = buildScopeOptions(copy);
  const scopeKeys = options.map((option) => option.key);

  const sidebarTabList = (
    <div
      className="flex flex-col gap-1"
      role="tablist"
      aria-label={copy.title}
      aria-orientation="vertical"
      onKeyDown={(event) =>
        handleScopeTabListKeyDown(
          event,
          scopeKeys,
          value,
          SETTINGS_SCOPE_PREFIX,
          "desktop",
          onChange,
          "vertical",
        )
      }
    >
      {options.map((option) => (
        <ScopeNavButton
          key={option.key}
          id={scopeTabId(SETTINGS_SCOPE_PREFIX, option.key, "desktop")}
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
          aria-label="Settings sections"
          pageTitle={copy.title}
          pageSubtitle={copy.subtitle}
        >
          <div className="px-2 py-4">{sidebarTabList}</div>
        </PortalChildSidePanel>
      ) : (
        <div className="hidden w-72 shrink-0 flex-col gap-1 lg:flex">{sidebarTabList}</div>
      )}
    </div>
  );
}

export function SettingsResultsHeader({
  title,
  description,
  meta,
}: {
  title: string;
  description: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 hidden text-sm text-text-muted lg:block">{description}</p>
      </div>
      {meta ? <div className="shrink-0 text-xs text-text-muted">{meta}</div> : null}
    </div>
  );
}

export function scopeMeta(
  copy: SettingsCopy,
  scope: SettingsScope,
): { title: string; description: string } {
  const map: Record<SettingsScope, { title: string; description: string }> = {
    general: { title: copy.scope.general, description: copy.scope.generalHint },
    billing: { title: copy.scope.billing, description: copy.scope.billingHint },
    security: { title: copy.scope.security, description: copy.scope.securityHint },
    analytics: { title: copy.scope.analytics, description: copy.scope.analyticsHint },
    onboarding: { title: copy.scope.onboarding, description: copy.scope.onboardingHint },
    categories: { title: copy.scope.categories, description: copy.scope.categoriesHint },
    integrations: {
      title: copy.scope.integrations,
      description: copy.scope.integrationsHint,
    },
  };
  return map[scope];
}

export { focusScopeTab as focusSettingsScopeTab };
