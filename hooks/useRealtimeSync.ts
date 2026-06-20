"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  SSE_CONNECT_DELAY_MS,
  SSE_INVALIDATION_DEBOUNCE_MS,
  SSE_MAX_CONSECUTIVE_ERRORS,
  SSE_RECONNECT_BASE_MS,
  SSE_RECONNECT_MAX_MS,
} from "@/lib/sync/constants";
import { createDebouncedBatch } from "@/lib/sync/debounced-batch";
import { invalidateEntities } from "@/lib/sync/invalidate-portal-data";
import type { SyncEntity, SyncVersionPayload } from "@/lib/sync/version";

/**
 * Subscribes to SSE sync events and invalidates targeted React Query caches
 * when another session changes shared records.
 */
export function useRealtimeSync(): void {
  const queryClient = useQueryClient();
  const lastVersionRef = useRef<string | null>(null);
  const retryDelayRef = useRef(SSE_RECONNECT_BASE_MS);
  const consecutiveErrorsRef = useRef(0);
  const debouncedInvalidateRef = useRef(
    createDebouncedBatch<SyncEntity>({
      debounceMs: SSE_INVALIDATION_DEBOUNCE_MS,
      onFlush: (entities) => {
        void invalidateEntities(queryClient, entities);
      },
    }),
  );

  useEffect(() => {
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    async function hasAuthenticatedSync(): Promise<boolean> {
      try {
        const res = await fetch("/api/sync/state", {
          credentials: "include",
          cache: "no-store",
        });
        return res.ok;
      } catch {
        return false;
      }
    }

    async function connect(): Promise<void> {
      if (disposed) return;

      const authed = await hasAuthenticatedSync();
      if (!authed) {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= SSE_MAX_CONSECUTIVE_ERRORS) {
          return;
        }
        retryTimer = setTimeout(() => {
          void connect();
        }, retryDelayRef.current);
        retryDelayRef.current = Math.min(
          retryDelayRef.current * 2,
          SSE_RECONNECT_MAX_MS,
        );
        return;
      }

      source = new EventSource("/api/sync/events");

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SyncVersionPayload;

          if (
            lastVersionRef.current !== null &&
            lastVersionRef.current !== data.version
          ) {
            const entities =
              data.entities.length > 0
                ? data.entities
                : ([
                    "visits",
                    "fieldSales",
                    "staff",
                    "followUps",
                    "callLogs",
                    "stores",
                  ] as SyncEntity[]);
            for (const entity of entities) {
              debouncedInvalidateRef.current.add(entity);
            }
          }

          lastVersionRef.current = data.version;
          retryDelayRef.current = SSE_RECONNECT_BASE_MS;
          consecutiveErrorsRef.current = 0;
        } catch {
          // ignore malformed events
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;

        if (disposed) return;

        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= SSE_MAX_CONSECUTIVE_ERRORS) {
          return;
        }

        const delay = retryDelayRef.current;
        retryDelayRef.current = Math.min(delay * 2, SSE_RECONNECT_MAX_MS);

        retryTimer = setTimeout(() => {
          void connect();
        }, delay);
      };
    }

    const connectTimer = setTimeout(() => {
      void connect();
    }, SSE_CONNECT_DELAY_MS);

    return () => {
      disposed = true;
      clearTimeout(connectTimer);
      if (retryTimer) clearTimeout(retryTimer);
      debouncedInvalidateRef.current.cancel();
      source?.close();
    };
  }, [queryClient]);
}
