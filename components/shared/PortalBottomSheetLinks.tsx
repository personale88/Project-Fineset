"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PortalBottomSheetLinkItem {
  key: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
}

interface PortalBottomSheetLinkListProps {
  links: PortalBottomSheetLinkItem[];
  onNavigate?: () => void;
  emptyMessage?: string;
}

export function PortalBottomSheetLinkList({
  links,
  onNavigate,
  emptyMessage,
}: PortalBottomSheetLinkListProps) {
  if (links.length === 0) {
    return emptyMessage ? (
      <p className="px-1 pb-2 text-sm text-text-secondary">{emptyMessage}</p>
    ) : null;
  }

  return (
    <ul className="space-y-2">
      {links.map((link) => {
        const Icon = link.icon;
        const rowClass = cn(
          "group flex items-center gap-3 rounded-xl border border-border bg-surface-card px-3 py-3 shadow-sm",
          "transition-colors hover:border-brand-gold/40 hover:bg-brand-gold/[0.03]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2",
          link.disabled && "pointer-events-none opacity-60",
        );

        const content = (
          <>
            {Icon ? (
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                  "bg-surface-secondary text-brand-gold",
                  "transition-colors group-hover:bg-brand-gold/10",
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
            ) : null}

            <span className="min-w-0 flex-1 text-sm font-medium text-text-primary">
              {link.label}
            </span>

            <ChevronRight
              className="h-4 w-4 shrink-0 text-text-muted transition-colors group-hover:text-brand-gold"
              aria-hidden
            />
          </>
        );

        return (
          <li key={link.key}>
            {link.href && !link.disabled ? (
              <Link
                href={link.href}
                onClick={() => {
                  onNavigate?.();
                  link.onClick?.();
                }}
                className={rowClass}
              >
                {content}
              </Link>
            ) : (
              <button
                type="button"
                disabled={link.disabled}
                onClick={() => {
                  if (link.disabled) return;
                  onNavigate?.();
                  link.onClick?.();
                }}
                className={cn(rowClass, "w-full text-left")}
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
