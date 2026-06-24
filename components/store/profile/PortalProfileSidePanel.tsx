"use client";

import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  HelpCircle,
  LogOut,
  ScrollText,
  Settings2,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileCopy, ProfileScope } from "@/components/store/profile/profile-scope";

interface ScopeOption {
  key: ProfileScope;
  label: string;
  hint: string;
  icon: typeof User;
}

function buildScopeOptions(copy: ProfileCopy): ScopeOption[] {
  return [
    {
      key: "account",
      label: copy.scope.account,
      hint: copy.scope.accountHint,
      icon: User,
    },
    {
      key: "staff",
      label: copy.scope.staff,
      hint: copy.scope.staffHint,
      icon: Users,
    },
    {
      key: "billing",
      label: copy.scope.billing,
      hint: copy.scope.billingHint,
      icon: CreditCard,
    },
    {
      key: "preferences",
      label: copy.scope.preferences,
      hint: copy.scope.preferencesHint,
      icon: Settings2,
    },
    {
      key: "support",
      label: copy.scope.support,
      hint: copy.scope.supportHint,
      icon: HelpCircle,
    },
    {
      key: "activity",
      label: copy.scope.activity,
      hint: copy.scope.activityHint,
      icon: ScrollText,
    },
    {
      key: "signOut",
      label: copy.scope.signOut,
      hint: copy.scope.signOutHint,
      icon: LogOut,
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

interface PortalProfileSidePanelProps {
  copy: ProfileCopy;
  value: ProfileScope;
  onChange: (value: ProfileScope) => void;
  panelIcon: LucideIcon;
  className?: string;
}

export function PortalProfileSidePanel({
  copy,
  value,
  onChange,
  panelIcon: PanelIcon,
  className,
}: PortalProfileSidePanelProps) {
  const options = buildScopeOptions(copy);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 lg:hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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

      <aside className="hidden lg:block lg:w-72 lg:shrink-0">
        <div
          className="sticky top-[calc(var(--portal-header-offset)+var(--portal-sticky-gap))] space-y-4 rounded-card border border-border bg-surface-card p-4 shadow-card"
          role="tablist"
          aria-orientation="vertical"
          aria-label={copy.scope.panelTitle}
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <span className="flex size-8 items-center justify-center rounded-md bg-brand-gold/10 text-brand-gold">
              <PanelIcon className="size-4" aria-hidden />
            </span>
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
    </div>
  );
}

export function ProfileResultsHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-border px-4 py-4 sm:px-5">
      <h2 className="font-display text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-1 text-sm text-text-secondary">{description}</p>
    </div>
  );
}
