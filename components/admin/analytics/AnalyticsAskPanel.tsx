"use client";

import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import {
  AnalyticsChatComposer,
  type AnalyticsChatComposerHandle,
} from "@/components/admin/analytics/AnalyticsChatComposer";
import { AnalyticsPromptPicker } from "@/components/admin/analytics/AnalyticsPromptPicker";
import { PortalChildSidePanel } from "@/components/layout/PortalChildSidePanel";
import { AnalyticsQuickSuggestions } from "@/components/admin/analytics/AnalyticsQuickSuggestions";
import { AnalyticsParseConfirmation } from "@/components/admin/analytics/AnalyticsParseConfirmation";
import { AskChartRenderer } from "@/components/admin/analytics/AskChartRenderer";
import { AskKpiGrid } from "@/components/admin/analytics/AskKpiGrid";
import { AnalyticsScopeCreditsBar } from "@/components/admin/analytics/AnalyticsScopeCreditsBar";
import { AnalyticsTokenEstimate } from "@/components/admin/analytics/AnalyticsTokenEstimate";
import { AnalyticsStreamingText } from "@/components/admin/analytics/AnalyticsStreamingText";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAnalyticsAskStream } from "@/hooks/useAnalyticsAskStream";
import { DataConfidenceBadge } from "@/components/admin/analytics/DataConfidenceBadge";
import { ANALYTICS_CREDITS_QUERY_KEY } from "@/hooks/useAnalyticsCredits";
import { buildAnalyticsAskExamples } from "@/lib/analytics/ask-example-prompts";
import { DEFAULT_ASK_KPI_METRICS } from "@/lib/analytics/ask-widget-catalog";
import { cn } from "@/lib/utils/cn";
import type { Content } from "@/content/en";

const ANALYTICS_HISTORY_KEY = "fineset:analytics-ask-history";

type AskCopy = Content["admin"]["analytics"]["ask"];
type CreditsCopy = Content["admin"]["analytics"]["credits"];

interface AnalyticsAskPanelProps {
  pageTitle: string;
  pageSubtitle?: string;
  copy: AskCopy;
  creditsCopy: CreditsCopy;
  common: Content["common"];
  errors: Content["errors"];
  kpis: Content["admin"]["analytics"]["kpis"];
  emptyBreakdown: string;
  scopeReady: boolean;
  storeId?: string;
  city?: string;
  storeCategory?: "JEWELRY" | "HANDBAGS" | "WATCHES" | "OTHER";
  balanceCredits?: number;
  lowBalanceThreshold?: number;
  creditsLoading?: boolean;
  creditsFetching?: boolean;
  creditsError?: boolean;
  onRetryCredits?: () => void;
  outOfCredits?: boolean;
  onRecharge: () => void;
  onInsufficientCredits: () => void;
  onOpenScopeFilters?: () => void;
  className?: string;
}

function loadHistoryPrompts(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ANALYTICS_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string").slice(0, 25);
  } catch {
    return [];
  }
}

function saveHistoryPrompts(prompts: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ANALYTICS_HISTORY_KEY, JSON.stringify(prompts.slice(0, 25)));
  } catch {
    // ignore quota errors
  }
}

function ReportGeneratingSkeleton({ label }: { label: string }) {
  return (
    <div className="mt-3 space-y-2" aria-live="polite" aria-busy="true">
      <p className="text-sm text-text-muted">{label}</p>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[92%]" />
      <Skeleton className="h-3 w-[78%]" />
    </div>
  );
}

export function AnalyticsAskPanel({
  pageTitle,
  pageSubtitle,
  copy,
  creditsCopy,
  common,
  errors,
  kpis,
  emptyBreakdown,
  scopeReady,
  storeId,
  city,
  storeCategory,
  balanceCredits: balanceCreditsProp,
  lowBalanceThreshold,
  creditsLoading,
  creditsFetching,
  creditsError,
  onRetryCredits,
  outOfCredits: outOfCreditsProp,
  onRecharge,
  onInsufficientCredits,
  onOpenScopeFilters,
  className,
}: AnalyticsAskPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<"recommendations" | "history">(
    "recommendations",
  );
  const [historyPrompts, setHistoryPrompts] = useState(() => loadHistoryPrompts());
  const [promptsSheetOpen, setPromptsSheetOpen] = useState(false);
  const [validationHint, setValidationHint] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileComposerRef = useRef<AnalyticsChatComposerHandle>(null);
  const desktopComposerRef = useRef<AnalyticsChatComposerHandle>(null);

  const queryClient = useQueryClient();

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

  const balanceCredits = streamBalance ?? balanceCreditsProp;
  const outOfCredits = outOfCreditsProp ?? balanceCredits === 0;

  const askPayload = useMemo(
    () => ({ storeId, city, storeCategory }),
    [storeId, city, storeCategory],
  );

  useEffect(() => {
    if (phase !== "done") return;

    void queryClient.invalidateQueries({ queryKey: ANALYTICS_CREDITS_QUERY_KEY });

    if (!activePrompt) return;

    startTransition(() => {
      setHistoryPrompts((current) => {
        const next = [activePrompt, ...current.filter((item) => item !== activePrompt)].slice(0, 25);
        saveHistoryPrompts(next);
        return next;
      });
    });
  }, [phase, queryClient, activePrompt]);

  const runAsk = useCallback(
    (textOverride?: string, options?: { confirmLowConfidence?: boolean }) => {
      const text = (textOverride ?? prompt).trim();
      setValidationHint(null);

      if (!scopeReady) return;
      if (text.length < 3) {
        setValidationHint(copy.promptTooShort);
        return;
      }

      setActivePrompt(text);
      setPromptsSheetOpen(false);
      if (textOverride) setPrompt(textOverride);
      scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
      ask({
        prompt: text,
        ...askPayload,
        confirmLowConfidence: options?.confirmLowConfidence ?? false,
      });
    },
    [askPayload, ask, prompt, scopeReady, copy.promptTooShort],
  );

  const handleEditConfirmation = useCallback(() => {
    resetStream();
    setActivePrompt(null);
    requestAnimationFrame(() => {
      mobileComposerRef.current?.focus();
      desktopComposerRef.current?.focus();
    });
  }, [resetStream]);

  const examples = useMemo(
    () => buildAnalyticsAskExamples(copy.examplePrompts),
    [copy.examplePrompts],
  );

  const quickExamples = useMemo(() => examples.slice(0, 6), [examples]);

  const errorLabel = useMemo(() => {
    if (!streamError || isConfirmationRequired) return errors.generic;
    if (streamError.code === "PROMPT_TOO_SHORT") return copy.promptTooShort;
    if (
      streamError.code === "HTTP_ERROR" &&
      streamError.message.includes("Invalid request body")
    ) {
      return copy.promptTooShort;
    }
    return streamError.message || errors.generic;
  }, [streamError, isConfirmationRequired, errors.generic, copy.promptTooShort]);

  useEffect(() => {
    if (streamError?.code === "INSUFFICIENT_CREDITS") {
      onInsufficientCredits();
    }
  }, [streamError?.code, onInsufficientCredits]);

  const showEmptyChat = !activePrompt && phase === "idle";
  const canSubmit =
    scopeReady && prompt.trim().length >= 3 && !isPending && !outOfCredits;
  const runDisabled = !scopeReady || isPending || outOfCredits;
  const showSuggestions = !isPending;

  const emptyDescription = !scopeReady
    ? copy.selectScopeEmptyDescription
    : outOfCredits
      ? copy.outOfCreditsEmptyDescription
      : copy.chatEmptyDescription;

  const emptyDescriptionDesktop = !scopeReady
    ? copy.selectScopeEmptyDescriptionDesktop
    : outOfCredits
      ? copy.outOfCreditsEmptyDescription
      : copy.chatEmptyDescriptionDesktop;

  const composerFooter = (
    <div className="space-y-1">
      {outOfCredits ? (
        <p className="text-xs text-status-error">{creditsCopy.emptyBanner}</p>
      ) : null}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:gap-y-1">
        <AnalyticsTokenEstimate
          copy={copy.tokenUsage}
          prompt={prompt}
          geminiConfigured={streamGeminiConfigured}
          usage={tokenUsage ?? confirmation?.tokenUsage}
        />
        <AnalyticsScopeCreditsBar
          copy={creditsCopy}
          layout="inline"
          balanceCredits={balanceCredits}
          lowBalanceThreshold={lowBalanceThreshold}
          isLoading={creditsLoading}
          isFetching={creditsFetching}
          isError={creditsError}
          onRetry={onRetryCredits}
          onRecharge={onRecharge}
        />
      </div>
    </div>
  );

  const promptPickerProps = {
    copy,
    examples,
    historyPrompts,
    activePrompt,
    activeTab: activeLeftTab,
    onTabChange: setActiveLeftTab,
    isPending,
    outOfCredits: runDisabled,
    scopeReady,
    onSelectPrompt: runAsk,
  };

  const chatPanelCard =
    "overflow-hidden rounded-card border border-border bg-surface-card shadow-card";

  const showReportSection =
    phase === "thinking" || phase === "done" || Boolean(reportText) || Boolean(report);
  const showGeminiStreamText =
    !streamGeminiConfigured && (phase === "thinking" || (reportText && !report));
  const showGeminiSkeleton = streamGeminiConfigured && phase === "thinking" && !report;

  return (
    <>
      <PortalChildSidePanel
        aria-label={copy.examplesLabel}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      >
        <div className="flex h-full min-h-0 flex-col px-3 py-4">
          <p id="analytics-ask-examples" className="sr-only">
            {copy.examplesLabel}
          </p>
          <AnalyticsPromptPicker
            {...promptPickerProps}
            layout="panel"
            className="min-h-0 flex-1"
          />
        </div>
      </PortalChildSidePanel>

      <section
        className={cn(
          chatPanelCard,
          "flex min-h-0 min-w-0 flex-1 flex-col",
          "max-lg:rounded-none max-lg:border-x-0 max-lg:border-b-0 max-lg:shadow-none",
          className,
        )}
        aria-label="Analytics chat"
      >
          <div
            ref={scrollRef}
            data-analytics-chat-scroll
            className={cn(
              "min-h-0 flex-1 px-4 py-4 sm:px-5 sm:py-5",
              "touch-pan-y overflow-y-auto overscroll-y-contain",
            )}
          >
            {showEmptyChat ? (
              <div className="flex min-h-[12rem] flex-col justify-center lg:min-h-0 lg:py-6">
                <div className="text-center">
                  <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gold/10 text-brand-gold">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="font-display text-base font-semibold text-text-muted">
                    {copy.chatEmptyTitle}
                  </p>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-text-muted lg:hidden">
                    {emptyDescription}
                  </p>
                  <p className="mx-auto mt-1 hidden max-w-sm text-sm text-text-muted lg:block">
                    {emptyDescriptionDesktop}
                  </p>
                  {!scopeReady && onOpenScopeFilters ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="mt-4 lg:hidden"
                      onClick={onOpenScopeFilters}
                    >
                      {copy.openScopeFilters}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-5">
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
                    <div className="rounded-2xl rounded-bl-md border border-border bg-surface-secondary/40 px-4 py-3 text-sm text-text-muted">
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
                          onEdit={handleEditConfirmation}
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
                          <div className="rounded-card border border-border bg-surface-secondary/30 px-4 py-3 text-sm text-text-muted">
                            {copy.noDataBanner}
                          </div>
                        ) : null}

                        <div className="rounded-card border border-border bg-surface-card p-4 text-sm shadow-sm">
                          <p className="font-medium text-text-primary">{copy.interpretedLabel}</p>
                          <p className="mt-1 text-text-muted">{result.interpretedQuery}</p>
                          <p className="mt-2 text-xs text-text-muted">
                            <span className="font-medium text-text-muted">
                              {copy.periodLabel}:
                            </span>{" "}
                            {result.period.label}
                          </p>
                          {result.scopeLabel ? (
                            <p className="mt-2 text-xs text-text-muted">
                              <span className="font-medium text-text-muted">
                                {copy.scopeLabel}:
                              </span>{" "}
                              {result.scopeLabel}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-text-muted">
                            {result.aiPowered ? copy.aiPowered : copy.rulePowered}
                            {result.geminiConfigured ? "" : ` · ${copy.geminiNotConfigured}`}
                          </p>
                          <div className="mt-3 border-t border-border pt-3">
                            <AnalyticsTokenEstimate
                              copy={copy.tokenUsage}
                              prompt={activePrompt ?? prompt}
                              geminiConfigured={result.geminiConfigured}
                              usage={result.tokenUsage}
                            />
                          </div>
                        </div>

                        {streamKpis?.dataConfidence && result.status !== "no_data" ? (
                          <DataConfidenceBadge
                            confidence={streamKpis.dataConfidence}
                            totalVisits={result.summary.totalVisits}
                          />
                        ) : null}

                        {result.status !== "no_data" ? (
                          <>
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
                          </>
                        ) : null}

                        {showReportSection ? (
                          <div className="rounded-card border border-border bg-surface-card p-4 shadow-card sm:p-6">
                            <h3 className="font-display text-lg font-semibold text-text-primary">
                              {copy.reportTitle}
                            </h3>
                            {showGeminiSkeleton ? (
                              <ReportGeneratingSkeleton label={copy.generatingReport} />
                            ) : null}
                            {showGeminiStreamText ? (
                              <AnalyticsStreamingText
                                text={reportText}
                                isStreaming={phase === "thinking"}
                                className="mt-3 text-text-muted"
                              />
                            ) : null}
                            {report ? (
                              <>
                                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                                  {report.summary}
                                </p>
                                {report.highlights.length > 0 ? (
                                  <div className="mt-4">
                                    <p className="text-sm font-medium text-text-primary">
                                      {copy.highlightsTitle}
                                    </p>
                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-muted">
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
                                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-muted">
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
                runDisabled={runDisabled}
                onSelect={runAsk}
                onBrowse={() => setPromptsSheetOpen(true)}
              />
            ) : null}

            <AnalyticsChatComposer
              ref={mobileComposerRef}
              id="analytics-ask-prompt"
              label={copy.promptLabel}
              value={prompt}
              placeholder={copy.promptPlaceholderMobile}
              submitLabel={copy.analyzeButton}
              rechargeLabel={creditsCopy.rechargeCta}
              canSubmit={canSubmit}
              outOfCredits={outOfCredits}
              validationHint={validationHint}
              onChange={(value) => {
                setPrompt(value);
                if (validationHint && value.trim().length >= 3) {
                  setValidationHint(null);
                }
              }}
              onSubmit={() => runAsk()}
              onSubmitAttempt={() => {
                if (!scopeReady) return;
                if (prompt.trim().length < 3) setValidationHint(copy.promptTooShort);
              }}
              onRecharge={onRecharge}
              variant="mobile"
              className={cn("lg:hidden", showSuggestions && "pt-1.5")}
              footer={composerFooter}
            />

            <div className="hidden lg:block">
              <AnalyticsChatComposer
                ref={desktopComposerRef}
                id="analytics-ask-prompt-desktop"
                label={copy.promptLabel}
                value={prompt}
                placeholder={copy.promptPlaceholder}
                submitLabel={copy.analyzeButton}
                rechargeLabel={creditsCopy.rechargeCta}
                canSubmit={canSubmit}
                outOfCredits={outOfCredits}
                validationHint={validationHint}
                onChange={(value) => {
                  setPrompt(value);
                  if (validationHint && value.trim().length >= 3) {
                    setValidationHint(null);
                  }
                }}
                onSubmit={() => runAsk()}
                onSubmitAttempt={() => {
                  if (!scopeReady) return;
                  if (prompt.trim().length < 3) setValidationHint(copy.promptTooShort);
                }}
                onRecharge={onRecharge}
                variant="desktop"
                footer={composerFooter}
              />
            </div>
          </div>
        </section>

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

    </>
  );
}
