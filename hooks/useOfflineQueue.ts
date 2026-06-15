"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  countOfflineMutations,
  enqueueOfflineMutation,
  type OfflineMutationKind,
} from "@/lib/offline/queue";
import {
  flushOfflineQueue,
  registerOfflineSyncListeners,
} from "@/lib/offline/sync-worker";

function subscribeOnline(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    () => true,
  );

  const refreshCount = useCallback(async () => {
    const count = await countOfflineMutations();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    const unregister = registerOfflineSyncListeners(() => {
      void refreshCount();
    });

    queueMicrotask(() => {
      void refreshCount();
    });

    return unregister;
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
