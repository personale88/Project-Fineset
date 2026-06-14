"use client";

import { useEffect, useState } from "react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { Button } from "@/components/ui/button";

export function OfflineQueueBanner() {
  const [mounted, setMounted] = useState(false);
  const { pendingCount, isOnline, syncNow } = useOfflineQueue();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || (pendingCount === 0 && isOnline)) {
    return null;
  }

  return (
    <div
      className="border-b border-status-warning/30 bg-status-warning/10 px-page-x py-2 text-sm text-text-secondary"
      role="status"
    >
      {!isOnline ? (
        <span>You are offline. Changes will sync when connection returns.</span>
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
