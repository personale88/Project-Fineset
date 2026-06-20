"use client";

import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useIsClient } from "@/hooks/useIsClient";
import { Button } from "@/components/ui/button";

export function OfflineQueueBanner() {
  const isClient = useIsClient();
  const { pendingCount, isOnline, syncNow } = useOfflineQueue();

  if (!isClient || (pendingCount === 0 && isOnline)) {
    return null;
  }

  return (
    <div
      className="border-b border-status-warning/30 bg-status-warning/10 px-page-x py-2 text-sm text-text-secondary"
      role="status"
    >
      {!isOnline ? (
        <span>You are offline. Some actions may be unavailable until your connection returns.</span>
      ) : (
        <span className="flex flex-wrap items-center gap-2">
          {pendingCount} pending {pendingCount === 1 ? "change" : "changes"} waiting to sync.
          <Button type="button" size="sm" variant="outline" onClick={() => void syncNow()}>
            Sync now
          </Button>
        </span>
      )}
    </div>
  );
}
