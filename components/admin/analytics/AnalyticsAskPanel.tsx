"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { AnalyticsChatComposer } from "@/components/admin/analytics/AnalyticsChatComposer";
import { AnalyticsCreditsRechargePane } from "@/components/admin/analytics/AnalyticsCreditsRechargePane";
import { AnalyticsPromptPicker } from "@/components/admin/analytics/AnalyticsPromptPicker";
import { AnalyticsQuickSuggestions } from "@/components/admin/analytics/AnalyticsQuickSuggestions";
import { AnalyticsScopeCreditsBar, formatShortPeriodLabel } from "@/components/admin/analytics/AnalyticsScopeCreditsBar";
import { AnalyticsParseConfirmation } from "@/components/admin/analytics/AnalyticsParseConfirmation";
import { AskChartRenderer } from "@/components/admin/analytics/AskChartRenderer";
import { AskKpiGrid } from "@/components/admin/analytics/AskKpiGrid";
import { AnalyticsTokenEstimate } from "@/components/admin/analytics/AnalyticsTokenEstimate";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAnalyticsAskStream } from "@/hooks/useAnalyticsAskStream";
import { AnalyticsStreamingText } from "@/components/admin/analytics/AnalyticsStreamingText";
import { DataConfidenceBadge } from "@/components/admin/analytics/DataConfidenceBadge";
import {
  ANALYTICS_CREDITS_QUERY_KEY,
  useAnalyticsCredits,
} from "@/hooks/useAnalyticsCredits";
import { buildAnalyticsAskExamples } from "@/lib/analytics/ask-example-prompts";
import { DEFAULT_ASK_KPI_METRICS } from "@/lib/analytics/ask-widget-catalog";
import { cn } from "@/lib/utils/cn";
import type { Content } from "@/content/en";

type AskCopy = Content["admin"]["analytics"]["ask"];
type CreditsCopy = Content["admin"]["analytics"]["credits"];

interface AnalyticsAskPanelProps {
  copy: AskCopy;
  creditsCopy: CreditsCopy;
  common: Content["common"];
  errors: Content["errors"];
  kpis: Content["admin"]["analytics"]["kpis"];
  emptyBreakdown: string;
  scopeSummary: string;
  storeId?: string;
  city?: string;
  storeCategory?: "JEWELRY" | "HANDBAGS" | "WATCHES" | "OTHER";
  className?: string;
}

export function AnalyticsAskPanel({
  copy,
  creditsCopy,
  common,
  errors,
  kpis,
  emptyBreakdown,
  scopeSummary,
  storeId,
  city,
  storeCategory,
  className,
}: AnalyticsAskPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<"recommendations" | "history">(
    "recommendations",
  );
  const [historyPrompts, setHistoryPrompts] = useState<string[]>([]);
  const [scopeChanged, setScopeChanged] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [promptsSheetOpen, setPromptsSheetOpen] = useState(false);
  const initialScopeRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef(0);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryClient = useQueryClient();
  const { data: credits, isLoading: creditsLoading, isFetching: creditsFetching, isError: creditsError, refetch: refetchCredits } =
    useAnalyticsCredits();

  const {
    phase,
    statusMessage,
    intent,
    parseSource,
    parseConfidence,
    geminiConfigured: streamGeminiConfigured,
    kpis: streamKpis,
    reportText,
    report,
    tokenUsage,
    balanceCredits: streamBalance,
    error: streamError,
    ask,
    reset: resetStream,
  } = useAnalyticsAskStream();

  const isPending = phase === "parsing" || phase === "querying" || phase === "thinking";
  const isError = phase === "error";

  // Confirmation required is signalled as a special error code
  const isConfirmationRequired = streamError?.code === "CONFIRMATION_REQUIRED";
  const confirmation = isConfirmationRequired
    ? {
        status: "confirmation_required" as const,
        interpretedQuery: intent ?? "",
        parseSource: (parseSource ?? "rules") as import("@/lib/analytics/ask-confidence").ParseSource,
        parseConfidence: (parseConfidence ?? "low") as import("@/lib/analytics/ask-confidence").ParseConfidence,
        geminiConfigured: streamGeminiConfigured,
        tokenUsage: null,
        message: streamError?.message ?? "",
      }
    : null;

  const result = streamKpis && !isConfirmationRequired
    ? {
        status: (streamKpis.dataAvailability === "empty" ? "no_data" : "success") as "success" | "no_data",
        interpretedQuery: intent ?? "",
        scopeLabel: streamKpis.scopeLabel,
        appliedFilters: streamKpis.appliedFilters,
        parseSource: (parseSource ?? "rules") as import("@/lib/analytics/ask-confidence").ParseSource,
        parseConfidence: (parseConfidence ?? "high") as import("@/lib/analytics/ask-confidence").ParseConfidence,
        aiPowered: parseSource === "gemini",
        geminiConfigured: streamGeminiConfigured,
        tokenUsage,
        balanceCredits: streamBalance ?? undefined,
        dataAvailability: streamKpis.dataAvailability,
        period: streamKpis.period,
        comparisonPeriod: streamKpis.comparisonPeriod,
        summary: streamKpis.summary,
        comparisonSummary: streamKpis.comparisonSummary,
        deltas: streamKpis.deltas,
        kpiCards: streamKpis.kpiCards,
        charts: streamKpis.charts,
        report: report ?? { summary: reportText, highlights: [], recommendations: [] },
      }
    : null;

  const balanceCredits = streamBalance ?? credits?.balanceCredits;
  const outOfCredits = balanceCredits === 0;

  const scopeKey = useMemo(
    () => JSON.stringify({ storeId, city, storeCategory }),
    [storeId, city, storeCategory],
  );

  const askPayload = useMemo(
    () => ({ storeId, city, storeCategory }),
    [storeId, city, storeCategory],
  );

  const runAsk = useCallback(
    (textOverride?: string, options?: { confirmLowConfidence?: boolean }) => {
      const text = (textOverride ?? prompt).trim();
      if (text.length < 3) return;

      setActivePrompt(text);
      setScopeChanged(false);
      setPromptsSheetOpen(false);
      if (!options?.confirmLowConfidence) {
        setHistoryPrompts((current) =>
          [text, ...current.filter((item) => item !== text)].slice(0, 25),
        );
      }
      if (textOverride) setPrompt(textOverride);
      ask({
        prompt: text,
        ...askPayload,
        confirmLowConfidence: options?.confirmLowConfidence ?? false,
      });
    },
    [askPayload, ask, prompt],
  );

  // Invalidate credits query when balance updates after a successful ask
  useEffect(() => {
    if (phase === "done") {
      void queryClient.invalidateQueries({ queryKey: ANALYTICS_CREDITS_QUERY_KEY });
    }
  }, [phase, queryClient]);

  useEffect(() => {
    if (initialScopeRef.current) {
      initialScopeRef.current = false;
      return;
    }

    if (!activePrompt) return;

    queueMicrotask(() => {
      setScopeChanged(true);
      ask({ prompt: activePrompt, ...askPayload, confirmLowConfidence: true });
      setScopeChanged(false);
    });
  }, [scopeKey]); // eslint-disable-line react-hooks/exhaustive-deps -- refresh only when scope changes

  const examples = useMemo(
    () => buildAnalyticsAskExamples(copy.examplePrompts),
    [copy.examplePrompts],
  );

  const quickExamples = useMemo(() => examples.slice(0, 4), [examples]);

  const errorLabel =
    streamError && !isConfirmationRequired
      ? (streamError.message || errors.generic)
      : errors.generic;

  const [prevStreamErrorCode, setPrevStreamErrorCode] = useState<string | undefined>();
  if (streamError?.code !== prevStreamErrorCode) {
    setPrevStreamErrorCode(streamError?.code);
    if (streamError?.code === "INSUFFICIENT_CREDITS") {
      setRechargeOpen(true);
    }
  }

  const displayedScope = result?.scopeLabel ?? scopeSummary;
  const showEmptyChat = !activePrompt && phase === "idle";
  const canSubmit = prompt.trim().length >= 3 && !isPending && !outOfCredits;
  const showSuggestions = !isPending && !confirmation;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = requestAnimationFrame(() => {
        const container = scrollRef.current;
        if (!container) return;

        const canScrollContainer = container.scrollHeight > container.clientHeight + 1;
        if (canScrollContainer) {
          const top = Math.max(0, container.scrollHeight - container.clientHeight);
          container.scrollTo({ top, behavior });
          return;
        }

        const anchor = scrollContentRef.current?.lastElementChild;
        if (anchor instanceof HTMLElement) {
          anchor.scrollIntoView({ behavior, block: "end" });
        }
      });
    });
  }, []);

  const scrollToBottomRef = useRef(scrollToBottom);

  useEffect(() => {
    scrollToBottomRef.current = scrollToBottom;
  }, [scrollToBottom]);

  useLayoutEffect(() => {
    if (!activePrompt || showEmptyChat) return;
    scrollToBottom("auto");
  }, [activePrompt, showEmptyChat, scrollToBottom]);

  useLayoutEffect(() => {
    if (!activePrompt || showEmptyChat) return;

    if (isPending) {
      scrollToBottom("auto");
      return;
    }

    if (result || confirmation) {
      scrollToBottom("smooth");
    }
  }, [activePrompt, isPending, result, confirmation, showEmptyChat, scrollToBottom]);

  useEffect(() => {
    const content = scrollContentRef.current;
    if (!content || showEmptyChat) return;

    const observer = new ResizeObserver(() => {
      const container = scrollRef.current;
      if (container) {
        const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distance >= 120) return;
      }

      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
      scrollDebounceRef.current = setTimeout(() => {
        scrollToBottomRef.current("smooth");
      }, 120);
    });

    observer.observe(content);
    return () => {
      observer.disconnect();
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current);
    };
  }, [showEmptyChat, activePrompt]);

  const promptPickerProps = {
    copy,
    examples,
    historyPrompts,
    activePrompt,
    activeTab: activeLeftTab,
    onTabChange: setActiveLeftTab,
    isPending,
    outOfCredits,
    onSelectPrompt: runAsk,
  };

  const panelCard =
    "rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-5";
  const chatPanelCard =
    "overflow-hidden rounded-card border border-border bg-surface-card shadow-card";

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)] lg:items-start lg:gap-6",
          className,
        )}
      >
        <div className="hidden min-h-0 lg:block lg:self-start">
          <aside
            className={cn(
              panelCard,
              "flex w-full flex-col overflow-hidden",
              "lg:sticky lg:top-[calc(var(--portal-header-offset)+var(--portal-sticky-gap,0.75rem))] lg:z-[5]",
              "lg:h-[calc(100svh-var(--portal-header-offset)-var(--portal-sticky-gap,0.75rem)-var(--portal-sticky-gap,0.75rem))]",
              "lg:max-h-[calc(100svh-var(--portal-header-offset)-var(--portal-sticky-gap,0.75rem)-var(--portal-sticky-gap,0.75rem))]",
            )}
            aria-labelledby="analytics-ask-examples"
          >
            <p id="analytics-ask-examples" className="sr-only">
              {copy.examplesLabel}
            </p>
            <AnalyticsPromptPicker {...promptPickerProps} className="min-h-0 flex-1" />
          </aside>
        </div>

        <section
          className={cn(
            chatPanelCard,
            "flex min-w-0 flex-col",
            "max-lg:min-h-0 max-lg:flex-1 max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:shadow-none",
            "lg:overflow-visible lg:self-start",
          )}
          aria-label="Analytics chat"
        >
          <div className="shrink-0 border-b border-border bg-surface-card/95 px-4 py-2 backdrop-blur-sm sm:px-5 sm:py-2.5">
            <div
              className={cn(
                "flex items-center gap-2 sm:gap-3",
                result?.period.label ? "justify-between" : "justify-end lg:justify-between",
              )}
            >
              {(result?.period.label ?? streamKpis?.period.label) ? (
                <p className="min-w-0 flex-1 truncate text-xs font-medium text-text-secondary lg:hidden">
                  {formatShortPeriodLabel((result?.period.label ?? streamKpis?.period.label)!)}
                </p>
              ) : null}
              <div className="hidden min-w-0 flex-1 lg:block">
                <p className="truncate text-xs leading-snug text-text-muted">
                  <span className="font-medium text-text-secondary">{copy.scopeLabel}:</span>{" "}
                  <span className="font-medium text-text-primary">{displayedScope}</span>
                </p>
              </div>
              <AnalyticsScopeCreditsBar
                copy={creditsCopy}
                periodLabel={result?.period.label}
                periodCaption={copy.periodLabel}
                balanceCredits={balanceCredits}
                lowBalanceThreshold={credits?.lowBalanceThreshold}
                isLoading={creditsLoading}
                isFetching={creditsFetching}
                isError={creditsError}
                onRetry={() => void refetchCredits()}
                onRecharge={() => setRechargeOpen(true)}
              />
            </div>
            {outOfCredits ? (
              <p className="mt-2 text-xs text-status-error">{creditsCopy.emptyBanner}</p>
            ) : null}
            {scopeChanged && activePrompt ? (
              <p className="mt-2 text-xs text-status-warning">{copy.scopeChangedHint}</p>
            ) : null}
          </div>

          <div
            ref={scrollRef}
            data-analytics-chat-scroll
            className={cn(
              "px-4 py-4 sm:px-5 sm:py-5",
              "max-lg:min-h-0 max-lg:flex-1 max-lg:touch-pan-y max-lg:overflow-y-auto max-lg:overscroll-contain",
              "lg:overflow-visible lg:flex-none",
            )}
          >
            {showEmptyChat ? (
              <div className="flex min-h-[12rem] flex-col justify-center lg:min-h-0 lg:py-6">
                <div className="text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="font-display text-base font-semibold text-text-primary">
                    {copy.chatEmptyTitle}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-text-muted lg:hidden">
                    {copy.chatEmptyDescription}
                  </p>
                  <p className="mx-auto mt-1 hidden max-w-sm text-sm text-text-muted lg:block">
                    {copy.chatEmptyDescriptionDesktop}
                  </p>
                </div>
              </div>
            ) : (
              <div ref={scrollContentRef} className="space-y-4 sm:space-y-5">
                {activePrompt ? (
                  <div className="flex justify-end">
                    <div className="max-w-[88%] rounded-2xl rounded-br-md bg-brand-gold px-4 py-2.5 text-sm leading-snug text-white shadow-sm">
                      {activePrompt}
                    </div>
                  </div>
                ) : null}

                {(isPending || (phase !== "idle" && intent && !result)) ? (
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                      <Sparkles className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="rounded-2xl rounded-bl-md border border-border bg-surface-secondary/40 px-4 py-3 text-sm text-text-secondary">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-gold" aria-hidden />
                        {statusMessage ?? common.loading}
                      </span>
                    </div>
                  </div>
                ) : null}

                <QueryLoadState
                  isLoading={false}
                  isError={isError && !isConfirmationRequired}
                  loadingLabel={common.loading}
                  errorLabel={errorLabel}
                  retryLabel={errors.tryAgain}
                  onRetry={() => {
                    resetStream();
                    if (activePrompt) runAsk(activePrompt);
                  }}
                >
                  {confirmation ? (
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                        <Sparkles className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <AnalyticsParseConfirmation
                          copy={copy.confirmation}
                          tokenCopy={copy.tokenUsage}
                          preview={confirmation}
                          prompt={activePrompt ?? prompt}
                          isPending={isPending}
                          onConfirm={() =>
                            runAsk(activePrompt ?? prompt, { confirmLowConfidence: true })
                          }
                          onEdit={() => {
                            resetStream();
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {result ? (
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10 text-brand-gold">
                        <Sparkles className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1 space-y-4 sm:space-y-6">
                      {result.status === "no_data" ? (
                        <div className="rounded-card border border-border bg-surface-secondary/30 px-4 py-3 text-sm text-text-secondary">
                          {copy.noDataBanner}
                        </div>
                      ) : null}
                      <div className="rounded-card border border-border bg-surface-card p-4 text-sm shadow-sm">
                        <p className="font-medium text-text-primary">{copy.interpretedLabel}</p>
                        <p className="mt-1 text-text-secondary">{result.interpretedQuery}</p>
                        <p className="mt-2 hidden text-xs text-text-muted lg:block">
                          <span className="font-medium text-text-secondary">
                            {copy.periodLabel}:
                          </span>{" "}
                          {result.period.label}
                        </p>
                        {result.scopeLabel ? (
                          <p className="mt-2 hidden text-xs text-text-muted lg:block">
                            <span className="font-medium text-text-secondary">
                              {copy.scopeLabel}:
                            </span>{" "}
                            {result.scopeLabel}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-text-muted">
                          {result.aiPowered ? copy.aiPowered : copy.rulePowered}
                          {result.geminiConfigured ? "" : ` · ${copy.geminiNotConfigured}`}
                        </p>
                        <div className="mt-3 hidden border-t border-border pt-3 sm:block">
                          <AnalyticsTokenEstimate
                            copy={copy.tokenUsage}
                            prompt={activePrompt ?? prompt}
                            geminiConfigured={result.geminiConfigured}
                            usage={result.tokenUsage}
                          />
                        </div>
                      </div>

                      {streamKpis?.dataConfidence ? (
                        <DataConfidenceBadge
                          confidence={streamKpis.dataConfidence}
                          totalVisits={result.summary.totalVisits}
                        />
                      ) : null}

                      <AskKpiGrid
                        cards={
                          result.kpiCards?.length
                            ? result.kpiCards
                            : DEFAULT_ASK_KPI_METRICS.map((metric) => ({ metric }))
                        }
                        summary={result.summary}
                        labels={kpis}
                      />

                      <AskChartRenderer
                        charts={result.charts}
                        revenueLabel={kpis.revenue}
                        emptyBreakdown={emptyBreakdown}
                      />

                      {(phase === "thinking" || phase === "done" || reportText) ? (
                        <div className="rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-6">
                          <h3 className="font-display text-lg font-semibold text-text-primary">
                            {copy.reportTitle}
                          </h3>
                          {/* Streaming AI text — shows token-by-token while thinking */}
                          {phase === "thinking" || (reportText && !report) ? (
                            <AnalyticsStreamingText
                              text={reportText}
                              isStreaming={phase === "thinking"}
                              className="mt-3 text-text-secondary"
                            />
                          ) : null}
                          {/* Structured report — shown once report_complete fires */}
                          {report ? (
                            <>
                              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                                {report.summary}
                              </p>
                              {report.highlights.length > 0 ? (
                                <div className="mt-4">
                                  <p className="text-sm font-medium text-text-primary">
                                    {copy.highlightsTitle}
                                  </p>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                                    {report.highlights.map((item) => (
                                      <li key={item}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                              {report.recommendations.length > 0 ? (
                                <div className="mt-4">
                                  <p className="text-sm font-medium text-text-primary">
                                    {copy.recommendationsTitle}
                                  </p>
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-secondary">
                                    {report.recommendations.map((item) => (
                                      <li key={item}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      </div>
                    </div>
                  ) : null}
                </QueryLoadState>
                <div className="h-px w-full shrink-0" aria-hidden />
              </div>
            )}
          </div>

          <div className="z-10 shrink-0 bg-surface-card/95 backdrop-blur-sm max-lg:sticky max-lg:bottom-0 max-lg:border-t max-lg:border-border/80 max-lg:shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)] lg:static lg:bg-transparent lg:shadow-none">
            {showSuggestions ? (
              <AnalyticsQuickSuggestions
                className="pt-2 lg:hidden"
                label={copy.mobileQuickPromptsLabel}
                browseLabel={copy.promptsMoreLabel}
                examples={quickExamples}
                activePrompt={activePrompt}
                isPending={isPending}
                outOfCredits={outOfCredits}
                onSelect={runAsk}
                onBrowse={() => setPromptsSheetOpen(true)}
              />
            ) : null}

            <AnalyticsChatComposer
              id="analytics-ask-prompt"
              label={copy.promptLabel}
              value={prompt}
              placeholder={copy.promptPlaceholderMobile}
              submitLabel={copy.analyzeButton}
              rechargeLabel={creditsCopy.rechargeCta}
              canSubmit={canSubmit}
              outOfCredits={outOfCredits}
              onChange={setPrompt}
              onSubmit={() => runAsk()}
              onRecharge={() => setRechargeOpen(true)}
              variant="mobile"
              className={cn("lg:hidden", showSuggestions && "pt-1.5")}
            />

            <div className="hidden lg:block">
              <AnalyticsChatComposer
                id="analytics-ask-prompt-desktop"
                label={copy.promptLabel}
                value={prompt}
                placeholder={copy.promptPlaceholder}
                submitLabel={copy.analyzeButton}
                rechargeLabel={creditsCopy.rechargeCta}
                canSubmit={canSubmit}
                outOfCredits={outOfCredits}
                onChange={setPrompt}
                onSubmit={() => runAsk()}
                onRecharge={() => setRechargeOpen(true)}
                variant="desktop"
                footer={
                  <AnalyticsTokenEstimate
                    copy={copy.tokenUsage}
                    prompt={prompt}
                    geminiConfigured={streamGeminiConfigured}
                    usage={tokenUsage ?? confirmation?.tokenUsage}
                  />
                }
              />
            </div>
          </div>
        </section>
      </div>

      <Sheet open={promptsSheetOpen} onOpenChange={setPromptsSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{copy.promptsSheetTitle}</SheetTitle>
            <SheetDescription>{copy.chatEmptyDescription}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex min-h-0 flex-1 flex-col pb-6">
            <AnalyticsPromptPicker {...promptPickerProps} className="min-h-0 flex-1" />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <AnalyticsCreditsRechargePane
        open={rechargeOpen}
        onOpenChange={setRechargeOpen}
        copy={creditsCopy}
      />
    </>
  );
}
