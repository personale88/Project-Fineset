/**
 * Analytics Ask — SSE streaming endpoint.
 *
 * Emits 8 ordered SSE events as the pipeline progresses:
 *   status(parsing) → intent → status(querying) → kpis
 *   → status(thinking) → report_chunk* → report_complete → done
 *
 * Errors at any stage emit an "error" event and close the stream.
 * The client never hangs — every code path closes the stream.
 */

import {
  getServerSession,
  requireRole,
} from "@/lib/auth/session";
import { isAnalyticsAskError } from "@/lib/analytics/ask-errors";
import { checkAnalyticsAskRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { analyticsAskBodySchema } from "@/lib/validations/admin-business-analytics-ask.schema";
import {
  scoreRuleParseConfidence,
  requiresParseConfirmation,
} from "@/lib/analytics/ask-confidence";
import { isOutOfScopeAnalyticsPrompt, outOfScopeMessage, assessDataAvailability } from "@/lib/analytics/ask-guardrails";
import { isGeminiConfigured, parseIntentWithGemini } from "@/lib/analytics/ask-gemini";
import { describeParsedIntent, parseAnalyticsAskIntent } from "@/lib/analytics/ask-intent-parser";
import { buildAskCharts } from "@/lib/analytics/ask-charts";
import { buildAskKpis } from "@/lib/analytics/ask-kpis";
import { buildRuleBasedAskReport } from "@/lib/analytics/ask-report";
import { applyAnalyticsScopeFilters, buildAnalyticsScopeDescription } from "@/lib/analytics/apply-scope-filters";
import { emptyDataReportMessage, sparseDataReportMessage } from "@/lib/analytics/ask-guardrails";
import { logAnalyticsAskAudit } from "@/lib/analytics/ask-audit-log";
import { streamAiReport, parseAiReportJson } from "@/lib/analytics/ask-ai-report";
import { assessConfidence } from "@/lib/analytics/data-honesty";
import { mergeTokenUsage } from "@/lib/analytics/token-estimate";
import type { TokenUsage } from "@/lib/analytics/token-estimate";
import { assertAnalyticsCreditsAvailable, deductAnalyticsCredits } from "@/lib/services/analytics-credits";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { getAdminBusinessAnalytics } from "@/lib/services/admin-business-analytics";
import { getCachedIntent, setCachedIntent, hashPrompt } from "@/lib/cache/analytics-cache";
import type { KpisPayload, AnalyticsStreamEvent } from "@/types/analytics-stream";
import { formatSseEvent } from "@/types/analytics-stream";

// ---------------------------------------------------------------------------
// SSE response helpers
// ---------------------------------------------------------------------------

function sseHeaders(): HeadersInit {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
    Connection: "keep-alive",
  };
}

function emit(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: AnalyticsStreamEvent,
): void {
  controller.enqueue(encoder.encode(formatSseEvent(event)));
}

function emitError(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  code: string,
  message: string,
): void {
  try {
    emit(controller, encoder, { type: "error", data: { code, message } });
    controller.close();
  } catch {
    // Stream may already be closed
  }
}

// ---------------------------------------------------------------------------
// Main route
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  // 1. Auth
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) {
    return new Response(
      formatSseEvent({ type: "error", data: { code: "UNAUTHORIZED", message: "Unauthorized" } }),
      { status: 401, headers: sseHeaders() },
    );
  }

  const platformSettings = await getPlatformSettings();
  if (!platformSettings.analytics.enabled) {
    return new Response(
      formatSseEvent({
        type: "error",
        data: {
          code: "ANALYTICS_DISABLED",
          message: "AI analytics is disabled in Master Settings.",
        },
      }),
      { status: 403, headers: sseHeaders() },
    );
  }

  // 2. Rate limit
  const identifier = `${session.userId}:${await getRequestIdentifier()}`;
  const rateLimit = await checkAnalyticsAskRateLimit(identifier);
  if (!rateLimit.success) {
    return new Response(
      formatSseEvent({
        type: "error",
        data: {
          code: "RATE_LIMITED",
          message: `Too many analytics requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
        },
      }),
      {
        status: 429,
        headers: {
          ...sseHeaders(),
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  // 3. Parse body
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return new Response(
      formatSseEvent({ type: "error", data: { code: "BAD_REQUEST", message: "Invalid JSON body" } }),
      { status: 400, headers: sseHeaders() },
    );
  }

  const parsed = analyticsAskBodySchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      formatSseEvent({ type: "error", data: { code: "BAD_REQUEST", message: "Invalid request body" } }),
      { status: 400, headers: sseHeaders() },
    );
  }

  const body = parsed.data;
  const started = Date.now();
  const userId = session.userId;
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // 4. Return SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // ── Phase 1: Scope & guardrail checks ─────────────────────────────
        if (body.prompt.trim().length < 3) {
          emitError(controller, encoder, "PROMPT_TOO_SHORT", "Enter at least 3 characters.");
          return;
        }
        if (isOutOfScopeAnalyticsPrompt(body.prompt)) {
          emitError(controller, encoder, "OUT_OF_SCOPE", outOfScopeMessage());
          return;
        }

        // ── Phase 2: Parse intent (rule-first, with intent cache) ──────────
        emit(controller, encoder, {
          type: "status",
          data: { phase: "parsing", message: "Understanding your question…" },
        });

        const ruleIntent = parseAnalyticsAskIntent(body.prompt);
        const ruleConfidence = scoreRuleParseConfidence(body.prompt, ruleIntent);

        let intent = ruleIntent;
        let parseSource: "rules" | "gemini" = "rules";
        let parseConfidence = ruleConfidence;
        let parseTokenUsage = null;

        if (ruleConfidence !== "high") {
          const promptHash = hashPrompt(body.prompt);
          const cachedIntent = await getCachedIntent(promptHash);

          if (cachedIntent) {
            intent = cachedIntent;
            parseSource = "gemini";
            parseConfidence = "high";
          } else if (isGeminiConfigured()) {
            try {
              const geminiResult = await parseIntentWithGemini(body.prompt);
              intent = geminiResult.intent;
              parseSource = "gemini";
              parseConfidence = "high";
              parseTokenUsage = geminiResult.tokenUsage;
              void setCachedIntent(promptHash, intent);
            } catch {
              // Fall back to rule parse on Gemini failure
            }
          }
        }

        // Confirmation required check
        if (!body.confirmLowConfidence && requiresParseConfirmation(parseConfidence, parseSource)) {
          logAnalyticsAskAudit({
            at: new Date().toISOString(),
            userId,
            promptLength: body.prompt.length,
            parseSource,
            parseConfidence,
            dataAvailability: "none",
            status: "confirmation_required",
            durationMs: Date.now() - started,
          });
          emit(controller, encoder, {
            type: "intent",
            data: {
              interpretedQuery: describeParsedIntent(intent),
              parseSource,
              parseConfidence,
              geminiConfigured: isGeminiConfigured(),
            },
          });
          emit(controller, encoder, {
            type: "error",
            data: {
              code: "CONFIRMATION_REQUIRED",
              message: "We interpreted your question using keyword rules. Confirm this matches what you meant before we query your data.",
            },
          });
          controller.close();
          return;
        }

        emit(controller, encoder, {
          type: "intent",
          data: {
            interpretedQuery: describeParsedIntent(intent),
            parseSource,
            parseConfidence,
            geminiConfigured: isGeminiConfigured(),
          },
        });

        // ── Phase 3: Credits check ─────────────────────────────────────────
        await assertAnalyticsCreditsAvailable(userId);

        // ── Phase 4: Fetch analytics data ─────────────────────────────────
        emit(controller, encoder, {
          type: "status",
          data: { phase: "querying", message: "Fetching your data…" },
        });

        const query = intentToAnalyticsQuery(intent);
        applyAnalyticsScopeFilters(query, body);
        const analytics = await getAdminBusinessAnalytics(query);

        const scopeLabel = buildAnalyticsScopeDescription(analytics.appliedFilters);
        const dimension = intent.breakdownDimension ?? "customerType";
        const dataAvailability = assessDataAvailability(analytics.summary.totalVisits);
        const dataConfidence = assessConfidence(analytics.summary);

        const charts =
          dataAvailability === "empty"
            ? []
            : buildAskCharts(intent, analytics, { prompt: body.prompt });

        const kpiCards = buildAskKpis(intent, analytics.summary, {
          prompt: body.prompt,
          deltas: analytics.comparison?.deltas ?? null,
        });

        const kpisPayload: KpisPayload = {
          period: analytics.period,
          comparisonPeriod: analytics.comparison?.period,
          summary: analytics.summary,
          comparisonSummary: analytics.comparison?.summary,
          deltas: analytics.comparison?.deltas,
          kpiCards,
          charts,
          appliedFilters: analytics.appliedFilters,
          scopeLabel,
          dataAvailability,
          dataConfidence,
        };

        emit(controller, encoder, { type: "kpis", data: kpisPayload });

        // ── Phase 5+6: AI streaming report ────────────────────────────────
        emit(controller, encoder, {
          type: "status",
          data: { phase: "thinking", message: "Analyzing results…" },
        });

        let report;
        let reportTokenUsage: TokenUsage | null = null;
        let reportParsedFromAi = false;

        if (dataAvailability === "empty") {
          // No AI call for empty data — return canned honest message
          report = {
            summary: emptyDataReportMessage(analytics.period.label, scopeLabel ?? ""),
            highlights: [],
            recommendations: [],
            dataAvailability: "empty" as const,
          };
          emit(controller, encoder, { type: "report_chunk", data: { text: report.summary } });
        } else if (dataAvailability === "sparse") {
          const sparseMsg = sparseDataReportMessage(
            analytics.summary.totalVisits,
            analytics.period.label,
          );

          if (apiKey) {
            // Stream AI report with sparse-data warning injected
            let accumulated = "";
            const generator = streamAiReport(analytics, body.prompt, apiKey);
            while (true) {
              const { value, done } = await generator.next();
              if (done) {
                reportTokenUsage = value ?? null;
                break;
              }
              accumulated += value;
              emit(controller, encoder, { type: "report_chunk", data: { text: value } });
            }
            const parsed = parseAiReportJson(accumulated);
            if (parsed.ok) {
              report = { ...parsed.report, dataAvailability: "sparse" as const };
              reportParsedFromAi = true;
            } else {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  "[analytics-ask-sse] AI report parse failed; using rule-based fallback.",
                  `accumulated length=${accumulated.length}`,
                );
              }
              report = buildRuleBasedAskReport(analytics, dimension, {
                dataAvailability: "sparse",
              });
            }
          } else {
            report = {
              summary: sparseMsg,
              highlights: [],
              recommendations: [],
              dataAvailability: "sparse" as const,
            };
            emit(controller, encoder, { type: "report_chunk", data: { text: report.summary } });
          }
        } else {
          if (apiKey) {
            // Full AI streaming report
            let accumulated = "";
            const generator = streamAiReport(analytics, body.prompt, apiKey);
            while (true) {
              const { value, done } = await generator.next();
              if (done) {
                reportTokenUsage = value ?? null;
                break;
              }
              accumulated += value;
              emit(controller, encoder, { type: "report_chunk", data: { text: value } });
            }
            const parsed = parseAiReportJson(accumulated);
            if (parsed.ok) {
              report = { ...parsed.report, dataAvailability: "ok" as const };
              reportParsedFromAi = true;
            } else {
              if (process.env.NODE_ENV !== "production") {
                console.warn(
                  "[analytics-ask-sse] AI report parse failed; using rule-based fallback.",
                  `accumulated length=${accumulated.length}`,
                );
              }
              report = buildRuleBasedAskReport(analytics, dimension, {
                dataAvailability: "ok",
              });
            }
          } else {
            // No API key — fall back to rule-based report
            report = buildRuleBasedAskReport(analytics, dimension, {
              dataAvailability,
            });
            emit(controller, encoder, { type: "report_chunk", data: { text: report.summary } });
          }
        }

        emit(controller, encoder, { type: "report_complete", data: { report } });

        // ── Phase 7: Credits deduction + done ─────────────────────────────
        const allTokenUsage = mergeTokenUsage(
          parseTokenUsage,
          reportParsedFromAi ? reportTokenUsage : null,
        );
        const balanceCredits = await deductAnalyticsCredits({
          appUserId: userId,
          tokensUsed: allTokenUsage?.totalTokens ?? null,
          description: `Analytics: ${body.prompt.slice(0, 120)}`,
        });

        logAnalyticsAskAudit({
          at: new Date().toISOString(),
          userId,
          promptLength: body.prompt.length,
          parseSource,
          parseConfidence,
          dataAvailability,
          status: dataAvailability === "empty" ? "no_data" : "success",
          durationMs: Date.now() - started,
          inputTokens: parseTokenUsage?.inputTokens,
          outputTokens: parseTokenUsage?.outputTokens,
          reportInputTokens: reportTokenUsage?.inputTokens,
          reportOutputTokens: reportTokenUsage?.outputTokens,
        });

        emit(controller, encoder, {
          type: "done",
          data: {
            status: dataAvailability === "empty" ? "no_data" : "success",
            balanceCredits,
            tokenUsage: allTokenUsage,
          },
        });

        controller.close();
      } catch (error) {
        if (isAnalyticsAskError(error)) {
          emitError(controller, encoder, error.code, error.message);
          return;
        }
        console.error("[analytics-ask-sse]", error);
        const message =
          error instanceof Error
            ? error.message
            : "Analytics could not be completed due to a server error.";
        emitError(controller, encoder, "SERVER_ERROR", message);
      }
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}

// ---------------------------------------------------------------------------
// Intent → query converter (duplicated from service for independence)
// ---------------------------------------------------------------------------

import type { ParsedAnalyticsAskIntent } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { AdminBusinessAnalyticsQuery } from "@/lib/validations/admin-business-analytics.schema";

function intentToAnalyticsQuery(intent: ParsedAnalyticsAskIntent): AdminBusinessAnalyticsQuery {
  const query: AdminBusinessAnalyticsQuery = {
    dateMode: intent.dateMode,
    activeFilters: intent.activeFilters ?? [],
    segment: intent.segment ?? "ALL",
    valueTier: intent.valueTier ?? "ALL",
  };

  if (intent.dateMode === "preset" && !intent.rollingMonths && !intent.rollingDays) {
    query.period = intent.period ?? "last30days";
  } else if (intent.period) {
    query.period = intent.period;
  }
  if (intent.month) query.month = intent.month;
  if (intent.year) query.year = intent.year;
  if (intent.compareAMonth) query.compareAMonth = intent.compareAMonth;
  if (intent.compareAYear) query.compareAYear = intent.compareAYear;
  if (intent.compareBMonth) query.compareBMonth = intent.compareBMonth;
  if (intent.compareBYear) query.compareBYear = intent.compareBYear;
  if (intent.customerType) query.customerType = intent.customerType;
  if (intent.productCategory) query.productCategory = intent.productCategory;
  if (intent.area) query.area = intent.area;
  if (intent.rollingMonths) query.rollingMonths = intent.rollingMonths;
  if (intent.rollingDays) query.rollingDays = intent.rollingDays;

  return query;
}
