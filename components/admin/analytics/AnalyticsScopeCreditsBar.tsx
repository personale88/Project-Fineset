"use client";

import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCredits } from "@/lib/analytics/credit-units";
import { cn } from "@/lib/utils/cn";
import type { Content } from "@/content/en";

type CreditsCopy = Content["admin"]["analytics"]["credits"];

type CreditsChipState = "loading" | "error" | "unknown" | "empty" | "low" | "healthy";

interface AnalyticsScopeCreditsBarProps {
  copy: CreditsCopy;
  periodLabel?: string;
  periodCaption?: string;
  balanceCredits?: number;
  lowBalanceThreshold?: number;
  isLoading?: boolean;
  isFetching?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onRecharge: () => void;
}

function resolveCreditsChipState(
  isLoading: boolean | undefined,
  isError: boolean | undefined,
  balanceCredits: number | undefined,
  lowBalanceThreshold: number,
): CreditsChipState {
  if (isLoading) return "loading";
  if (isError) return "error";
  if (balanceCredits == null) return "unknown";
  if (balanceCredits <= 0) return "empty";
  if (balanceCredits <= lowBalanceThreshold) return "low";
  return "healthy";
}

function formatCreditsRemainingLabel(count: number, copy: CreditsCopy): string {
  const safeCount = Math.max(0, Math.floor(count));

  if (safeCount === 0) return copy.balanceEmpty;
  if (safeCount === 1) return copy.balanceRemainingSingular;
  return copy.balanceRemaining.replace("{count}", formatCredits(safeCount));
}

export function formatShortPeriodLabel(label: string): string {
  const index = label.indexOf("(");
  return (index === -1 ? label : label.slice(0, index)).trim();
}

function formatCompactCreditsLabel(count: number, copy: CreditsCopy): string {
  return copy.balanceShort.replace("{count}", formatCredits(Math.max(0, Math.floor(count))));
}

function chipToneClasses(state: CreditsChipState) {
  switch (state) {
    case "error":
    case "empty":
      return {
        chip: "border-status-error/25 bg-status-error/[0.04] hover:bg-status-error/10",
        icon: "bg-status-error/10 text-status-error",
        label: "text-status-error",
        action: "text-status-error",
      };
    case "low":
      return {
        chip: "border-status-warning/25 bg-status-warning/[0.04] hover:bg-status-warning/10",
        icon: "bg-status-warning/10 text-status-warning",
        label: "text-status-warning",
        action: "text-status-warning",
      };
    case "unknown":
      return {
        chip: "border-border bg-surface-secondary/40 hover:bg-surface-secondary/60",
        icon: "bg-surface-secondary text-text-muted",
        label: "text-text-secondary",
        action: "text-text-secondary",
      };
    default:
      return {
        chip: "border-border bg-surface-card hover:border-brand-gold/30 hover:bg-surface-secondary/40",
        icon: "bg-brand-gold/10 text-brand-gold",
        label: "text-text-primary",
        action: "text-brand-gold",
      };
  }
}

export function AnalyticsScopeCreditsBar({
  copy,
  periodLabel,
  periodCaption,
  balanceCredits,
  lowBalanceThreshold = 5,
  isLoading,
  isFetching,
  isError,
  onRetry,
  onRecharge,
}: AnalyticsScopeCreditsBarProps) {
  const showLoading = Boolean(isLoading || isFetching);
  const state = resolveCreditsChipState(showLoading, isError, balanceCredits, lowBalanceThreshold);
  const tone = chipToneClasses(state);

  const balanceLabel =
    state === "error"
      ? copy.loadFailedShort
      : state === "unknown"
        ? copy.balanceUnknown
        : formatCreditsRemainingLabel(balanceCredits ?? 0, copy);

  const compactBalanceLabel =
    state === "error"
      ? copy.loadFailedShort
      : state === "unknown"
        ? copy.balanceUnknown
        : state === "empty"
          ? copy.balanceEmpty
          : formatCompactCreditsLabel(balanceCredits ?? 0, copy);

  const actionLabel =
    state === "empty" ? copy.rechargeCta : state === "low" ? copy.topUpCta : null;

  const mobileActionLabel = state === "empty" || state === "low" ? actionLabel : null;

  const ariaLabel = actionLabel ? `${balanceLabel}. ${actionLabel}.` : balanceLabel;

  return (
    <div className="flex shrink-0 items-center lg:flex-col lg:items-end lg:gap-1">
      {periodLabel && periodCaption ? (
        <p className="hidden min-w-0 truncate text-xs text-text-muted lg:block">
          <span className="font-medium text-text-secondary">{periodCaption}:</span>{" "}
          <span className="font-medium text-text-primary">{periodLabel}</span>
        </p>
      ) : null}

      <div className="lg:pt-0.5">
        {state === "loading" ? (
          <Skeleton className="h-7 w-24 rounded-full lg:h-8 lg:w-36" aria-label={copy.balanceLabel} />
        ) : state === "error" ? (
          <button
            type="button"
            onClick={() => onRetry?.()}
            aria-label={ariaLabel}
            className={cn(
              "inline-flex h-7 max-w-[9.5rem] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] font-medium shadow-sm transition-colors lg:h-8 lg:max-w-full lg:gap-2 lg:px-3 lg:text-xs",
              tone.chip,
              tone.label,
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full lg:h-5 lg:w-5",
                tone.icon,
              )}
            >
              <Sparkles className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden />
            </span>
            <span className="truncate">{compactBalanceLabel}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onRecharge}
            aria-label={ariaLabel}
            className={cn(
              "inline-flex h-7 max-w-[9.5rem] items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-[11px] shadow-sm transition-colors lg:h-8 lg:max-w-full lg:gap-2 lg:px-3 lg:text-xs",
              tone.chip,
            )}
          >
            <span
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded-full lg:h-5 lg:w-5",
                tone.icon,
              )}
            >
              <Sparkles className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden />
            </span>
            <span className={cn("truncate font-medium tabular-nums lg:hidden", tone.label)}>
              {compactBalanceLabel}
            </span>
            <span className={cn("hidden font-medium tabular-nums lg:inline", tone.label)}>
              {balanceLabel}
            </span>
            {actionLabel ? (
              <>
                <span className="hidden text-text-muted/70 lg:inline" aria-hidden>
                  ·
                </span>
                <span className={cn("hidden font-semibold lg:inline", tone.action)}>
                  {actionLabel}
                </span>
              </>
            ) : null}
            {mobileActionLabel ? (
              <span className={cn("font-semibold lg:hidden", tone.action)}>{mobileActionLabel}</span>
            ) : null}
          </button>
        )}
      </div>
    </div>
  );
}
