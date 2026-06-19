"use client";

import { useEffect } from "react";

/**
 * Unregisters service workers in local dev so Serwist does not serve stale
 * Turbopack chunks after HMR (ChunkLoadError on app/error and route chunks).
 */
export function PwaDevCleanup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (typeof window === "undefined") return;

    void (async () => {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    })();
  }, []);

  return null;
}
