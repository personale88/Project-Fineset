"use client";

import { useRef } from "react";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarRange,
  Clock3,
  Crown,
  Gem,
  LayoutGrid,
  MapPin,
  Radar,
  Share2,
  Target,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { portalChildSideNavScrollClassName, portalChildSideNavBodyTextClassName, portalChildSideNavCategoryLabelClassName } from "@/components/layout/portal-side-nav-styles";
import { useScrollChainAtEdges } from "@/hooks/useScrollChainAtEdges";
import { cn } from "@/lib/utils/cn";
import type { AnalyticsAskExample } from "@/lib/analytics/ask-example-prompts";
import type { Content } from "@/content/en";

type AskCopy = Content["admin"]["analytics"]["ask"];

const EXAMPLE_ICONS = {
  compare: ArrowLeftRight,
  "compare-visits": BarChart3,
  trend: TrendingUp,
  week: CalendarRange,
  segment: Users,
  breakdown: LayoutGrid,
  conversion: Target,
  source: Share2,
  area: MapPin,
  vip: Crown,
  scheme: Gem,
  retained: UserCheck,
  overview: Radar,
} as const;

interface AnalyticsPromptPickerProps {
  copy: AskCopy;
  examples: AnalyticsAskExample[];
  historyPrompts: string[];
  activePrompt: string | null;
  activeTab: "recommendations" | "history";
  onTabChange: (tab: "recommendations" | "history") => void;
  isPending: boolean;
  outOfCredits: boolean;
  scopeReady?: boolean;
  onSelectPrompt: (prompt: string) => void;
  className?: string;
  listClassName?: string;
  /** Docked admin child panel vs sheet / inline embed. */
  layout?: "panel" | "embedded";
}

export function AnalyticsPromptPicker({
  copy,
  examples,
  historyPrompts,
  activePrompt,
  activeTab,
  onTabChange,
  isPending,
  outOfCredits,
  scopeReady = false,
  onSelectPrompt,
  className,
  listClassName,
  layout = "embedded",
}: AnalyticsPromptPickerProps) {
  const recommendationsScrollRef = useRef<HTMLDivElement>(null);
  const historyScrollRef = useRef<HTMLDivElement>(null);
  const isPanel = layout === "panel";

  useScrollChainAtEdges(recommendationsScrollRef, !isPanel && activeTab === "recommendations");
  useScrollChainAtEdges(historyScrollRef, !isPanel && activeTab === "history");

  const scrollPanelClassName = isPanel
    ? cn(
        "mt-0 min-h-0 flex-1 overflow-y-auto overscroll-y-contain data-[state=inactive]:hidden",
        portalChildSideNavScrollClassName,
      )
    : cn(
        "absolute inset-0 mt-0 overflow-y-auto overscroll-auto",
        portalChildSideNavScrollClassName,
      );

  const promptTextClassName = scopeReady
    ? "text-text-primary group-hover:text-text-primary"
    : "text-text-muted group-hover:text-text-secondary";

  const tabTriggerClassName = isPanel
    ? "h-auto min-h-8 whitespace-normal px-1.5 py-1.5 text-center text-xs leading-tight text-text-muted data-[state=active]:text-text-primary"
    : "h-auto min-h-8 whitespace-normal px-1.5 py-1.5 text-center text-[11px] leading-tight text-text-muted data-[state=active]:text-text-primary";

  const bodyTextClassName = isPanel ? portalChildSideNavBodyTextClassName : "text-sm leading-snug";
  const categoryLabelClassName = isPanel
    ? portalChildSideNavCategoryLabelClassName
    : "text-[11px] font-medium uppercase tracking-wider text-text-muted";

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) =>
        onTabChange(value === "history" ? "history" : "recommendations")
      }
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <TabsList
        aria-label={copy.examplesLabel}
        className="grid h-auto min-h-10 w-full shrink-0 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-stretch gap-0.5 p-1"
      >
        <TabsTrigger
          value="recommendations"
          className={tabTriggerClassName}
        >
          {copy.examplesLabel}
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className={tabTriggerClassName}
        >
          {copy.historyTabLabel}
        </TabsTrigger>
      </TabsList>

      <div
        className={cn(
          isPanel ? "mt-3 flex min-h-0 flex-1 flex-col" : "relative mt-3 min-h-0 flex-1",
        )}
      >
        <TabsContent
          ref={recommendationsScrollRef}
          value="recommendations"
          className={cn(scrollPanelClassName, listClassName)}
          data-analytics-recommendations-scroll
        >
          <ul className="flex flex-col gap-2 pb-1">
            {examples.map((example) => {
              const Icon =
                EXAMPLE_ICONS[example.id as keyof typeof EXAMPLE_ICONS] ?? LayoutGrid;
              const isActive = activePrompt === example.prompt;
              return (
                <li key={example.id}>
                  <button
                    type="button"
                    disabled={isPending || outOfCredits}
                    onClick={() => onSelectPrompt(example.prompt)}
                    className={cn(
                      "group flex w-full gap-3 rounded-card border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/45 disabled:cursor-not-allowed disabled:opacity-60",
                      isActive
                        ? "border-brand-gold/50 bg-brand-gold/5 shadow-sm"
                        : "border-border bg-surface-card shadow-sm hover:border-brand-gold/35 hover:bg-surface-secondary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                        isActive
                          ? "bg-brand-gold/20 text-brand-gold"
                          : "bg-brand-gold/10 text-brand-gold group-hover:bg-brand-gold/15",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      {example.hint ? (
                        <span className={cn("block", categoryLabelClassName)}>
                          {example.hint}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "mt-0.5 block transition-colors",
                          bodyTextClassName,
                          promptTextClassName,
                        )}
                      >
                        {example.prompt}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </TabsContent>

        <TabsContent
          ref={historyScrollRef}
          value="history"
          className={cn(scrollPanelClassName, listClassName)}
          data-analytics-recommendations-scroll
        >
          {historyPrompts.length === 0 ? (
            <p className={cn("rounded-card border border-border bg-surface-secondary/30 px-3.5 py-3 text-text-muted", bodyTextClassName)}>
              {copy.historyEmpty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 pb-1">
              {historyPrompts.map((question) => {
                const isActive = activePrompt === question;
                return (
                  <li key={question}>
                    <button
                      type="button"
                      disabled={isPending || outOfCredits}
                      onClick={() => onSelectPrompt(question)}
                      className={cn(
                        "group flex w-full gap-3 rounded-card border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/45 disabled:cursor-not-allowed disabled:opacity-60",
                        isActive
                          ? "border-brand-gold/50 bg-brand-gold/5 shadow-sm"
                          : "border-border bg-surface-card shadow-sm hover:border-brand-gold/35 hover:bg-surface-secondary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          isActive
                            ? "bg-brand-gold/20 text-brand-gold"
                            : "bg-brand-gold/10 text-brand-gold group-hover:bg-brand-gold/15",
                        )}
                      >
                        <Clock3 className="h-4 w-4" aria-hidden />
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 transition-colors",
                          bodyTextClassName,
                          promptTextClassName,
                        )}
                      >
                        {question}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
