import {
  listOfflineMutations,
  removeOfflineMutation,
  updateOfflineMutation,
  type OfflineMutation,
} from "@/lib/offline/queue";

const MAX_RETRIES = 5;

async function replayMutation(mutation: OfflineMutation): Promise<boolean> {
  try {
    const res = await fetch(mutation.url, {
      method: mutation.method,
      headers: { "Content-Type": "application/json" },
      body: mutation.body,
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      await removeOfflineMutation(mutation.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pending = await listOfflineMutations();
  let synced = 0;
  let failed = 0;

  for (const mutation of pending.sort((a, b) => a.createdAt - b.createdAt)) {
    const ok = await replayMutation(mutation);
    if (ok) {
      synced += 1;
    } else {
      failed += 1;
      const next = { ...mutation, retryCount: mutation.retryCount + 1 };
      if (next.retryCount >= MAX_RETRIES) {
        await removeOfflineMutation(mutation.id);
      } else {
        await updateOfflineMutation(next);
      }
    }
  }

  return { synced, failed };
}

export function registerOfflineSyncListeners(onChange?: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleOnline = () => {
    void flushOfflineQueue().then(() => onChange?.());
  };

  window.addEventListener("online", handleOnline);
  return () => window.removeEventListener("online", handleOnline);
}
