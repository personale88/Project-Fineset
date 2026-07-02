"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsAskExample } from "@/lib/analytics/ask-example-prompts";

interface AnalyticsQuickSuggestionsProps {
  label: string;
  browseLabel: string;
  examples: AnalyticsAskExample[];
  activePrompt: string | null;
  isPending: boolean;
  runDisabled: boolean;
  onSelect: (prompt: string) => void;
  onBrowse: () => void;
  className?: string;
}

export function AnalyticsQuickSuggestions({
  label,
  browseLabel,
  examples,
  activePrompt,
  isPending,
  runDisabled,
  onSelect,
  onBrowse,
  className,
}: AnalyticsQuickSuggestionsProps) {
  return (
    <div className={cn("relative shrink-0", className)} data-analytics-suggestions>
      <p className="sr-only">{label}</p>

      <div className="flex items-center">
        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-3 bg-gradient-to-r from-surface-card to-transparent" />

          <div
            className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain px-3 py-0.5 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            aria-label={label}
          >
            {examples.map((example) => {
              const isActive = activePrompt === example.prompt;
              const chipLabel = example.hint ?? example.prompt;

              return (
                <button
                  key={example.id}
                  type="button"
                  role="listitem"
                  aria-label={example.prompt}
                  disabled={isPending || runDisabled}
                  onClick={() => onSelect(example.prompt)}
                  className={cn(
                    "shrink-0 snap-start whitespace-nowrap rounded-full border px-2.5 py-1 text-left text-xs font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/45 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
                    isActive
                      ? "border-brand-gold/50 bg-brand-gold/10 text-text-primary"
                      : "border-border/80 bg-surface-secondary/50 text-text-muted hover:border-brand-gold/35 hover:bg-surface-secondary/80 hover:text-text-secondary",
                  )}
                >
                  {chipLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative z-[2] shrink-0 bg-surface-card pl-1 pr-3 shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.12)]">
          <button
            type="button"
            disabled={isPending}
            onClick={onBrowse}
            className={cn(
              "inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border border-dashed border-border/80 bg-surface-card px-2.5 py-1 text-xs font-medium text-text-muted transition-colors",
              "hover:border-brand-gold/40 hover:bg-surface-secondary/40 hover:text-text-secondary",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/45 active:scale-[0.98] disabled:opacity-60",
            )}
          >
            {browseLabel}
            <ChevronRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
