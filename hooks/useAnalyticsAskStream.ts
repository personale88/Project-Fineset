/**
 * Consumes the SSE stream from POST /api/analytics/admin/business/ask and
 * exposes progressive state as each event arrives. The UI renders KPI cards
 * and charts immediately when the "kpis" event lands, then renders streaming
 * AI text token-by-token as "report_chunk" events arrive.
 */

"use client";

import { useCallback, useRef, useState } from "react";
import type { AnalyticsAskBody } from "@/lib/validations/admin-business-analytics-ask.schema";
import type { TokenUsage } from "@/lib/analytics/token-estimate";
import type { KpisPayload, AnalyticsStreamEvent } from "@/types/analytics-stream";
import type { AnalyticsAskReport } from "@/types/admin-business-analytics-ask";

// ---------------------------------------------------------------------------
// Public state shape
// ---------------------------------------------------------------------------

export type AskPhase =
  | "idle"
  | "parsing"
  | "querying"
  | "thinking"
  | "done"
  | "error";

export interface AnalyticsAskStreamState {
  phase: AskPhase;
  statusMessage: string | null;
  intent: string | null;
  parseSource: string | null;
  parseConfidence: string | null;
  kpis: KpisPayload | null;
  reportText: string;
  report: AnalyticsAskReport | null;
  tokenUsage: TokenUsage | null;
  balanceCredits: number | null;
  error: { code: string; message: string } | null;
}

export interface UseAnalyticsAskStreamReturn extends AnalyticsAskStreamState {
  ask: (body: AnalyticsAskBody) => void;
  abort: () => void;
  reset: () => void;
}

// ---------------------------------------------------------------------------
// Initial / reset state
// ---------------------------------------------------------------------------

const INITIAL_STATE: AnalyticsAskStreamState = {
  phase: "idle",
  statusMessage: null,
  intent: null,
  parseSource: null,
  parseConfidence: null,
  kpis: null,
  reportText: "",
  report: null,
  tokenUsage: null,
  balanceCredits: null,
  error: null,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAnalyticsAskStream(): UseAnalyticsAskStreamReturn {
  const [state, setState] = useState<AnalyticsAskStreamState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback((body: AnalyticsAskBody) => {
    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...INITIAL_STATE, phase: "parsing", statusMessage: "Understanding your question…" });

    void (async () => {
      try {
        const response = await fetch("/api/analytics/admin/business/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "Server error");
          setState((prev) => ({
            ...prev,
            phase: "error",
            error: { code: "HTTP_ERROR", message: text.slice(0, 200) },
          }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            let event: AnalyticsStreamEvent;
            try {
              event = JSON.parse(jsonStr) as AnalyticsStreamEvent;
            } catch {
              continue;
            }

            handleEvent(event);
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          phase: "error",
          error: {
            code: "NETWORK_ERROR",
            message: err instanceof Error ? err.message : "Network error",
          },
        }));
      }
    })();

    function handleEvent(event: AnalyticsStreamEvent) {
      switch (event.type) {
        case "status":
          setState((prev) => ({
            ...prev,
            phase: event.data.phase,
            statusMessage: event.data.message,
          }));
          break;

        case "intent":
          setState((prev) => ({
            ...prev,
            intent: event.data.interpretedQuery,
            parseSource: event.data.parseSource,
            parseConfidence: event.data.parseConfidence,
          }));
          break;

        case "kpis":
          setState((prev) => ({ ...prev, kpis: event.data }));
          break;

        case "report_chunk":
          setState((prev) => ({ ...prev, reportText: prev.reportText + event.data.text }));
          break;

        case "report_complete":
          setState((prev) => ({ ...prev, report: event.data.report }));
          break;

        case "done":
          setState((prev) => ({
            ...prev,
            phase: "done",
            tokenUsage: event.data.tokenUsage,
            balanceCredits: event.data.balanceCredits,
            statusMessage: null,
          }));
          break;

        case "error":
          setState((prev) => ({
            ...prev,
            phase: "error",
            error: { code: event.data.code, message: event.data.message },
            statusMessage: null,
          }));
          break;
      }
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, phase: "idle", statusMessage: null }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, ask, abort, reset };
}
