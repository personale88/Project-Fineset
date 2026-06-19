"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "fineset-chunk-reload";

function isChunkLoadFailure(message: string): boolean {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Failed to load chunk") ||
    message.includes("Loading chunk")
  );
}

/**
 * After deploys or Turbopack HMR, the browser may request stale JS chunks.
 * Reload once so the client picks up the current manifest.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 10_000);

    function maybeReload(message: string) {
      if (!isChunkLoadFailure(message)) return;
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      maybeReload(event.message ?? "");
    }

    function onRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "";
      maybeReload(message);
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
