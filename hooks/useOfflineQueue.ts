"use client";

import { useCallback, useEffect, useState } from "react";
import {
  countOfflineMutations,
  enqueueOfflineMutation,
  type OfflineMutationKind,
} from "@/lib/offline/queue";
import {
  flushOfflineQueue,
  registerOfflineSyncListeners,
} from "@/lib/offline/sync-worker";

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const refreshCount = useCallback(async () => {
    const count = await countOfflineMutations();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    void refreshCount();
    const unregister = registerOfflineSyncListeners(() => {
      void refreshCount();
    });

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      unregister();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [refreshCount]);

  const queueMutation = useCallback(
    async (params: {
      kind: OfflineMutationKind;
      url: string;
      method?: "POST" | "PATCH";
      body: unknown;
    }) => {
      await enqueueOfflineMutation({
        kind: params.kind,
        url: params.url,
        method: params.method ?? "POST",
        body: JSON.stringify(params.body),
      });
      await refreshCount();
    },
    [refreshCount],
  );

  const syncNow = useCallback(async () => {
    const result = await flushOfflineQueue();
    await refreshCount();
    return result;
  }, [refreshCount]);

  return {
    pendingCount,
    isOnline,
    queueMutation,
    syncNow,
    refreshCount,
  };
}
