"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  applyServiceWorkerUpdate,
  dismissPwaUpdate,
  isPwaUpdateDismissed,
} from "@/lib/pwa/service-worker-update";

/**
 * When a new service worker is waiting (skipWaiting: false in sw.ts),
 * offer a reload instead of forcing mid-navigation takeover.
 */
export function PwaServiceWorkerUpdate() {
  const [waiting, setWaiting] = useState(false);
  const applyingUpdateRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const fallbackReloadRef = useRef<number | null>(null);

  const markUpdateAvailable = useCallback(
    (registration: ServiceWorkerRegistration) => {
      if (isPwaUpdateDismissed()) return;

      registrationRef.current = registration;
      waitingWorkerRef.current = registration.waiting;
      setWaiting(true);
    },
    [],
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function listenForWaiting(registration: ServiceWorkerRegistration) {
      if (registration.waiting) {
        markUpdateAvailable(registration);
      }

      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;

        installing.addEventListener("statechange", () => {
          if (
            installing.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            markUpdateAvailable(registration);
          }
        });
      });
    }

    void navigator.serviceWorker.ready.then(listenForWaiting);

    const onControllerChange = () => {
      if (!applyingUpdateRef.current) return;
      applyingUpdateRef.current = false;
      if (fallbackReloadRef.current !== null) {
        window.clearTimeout(fallbackReloadRef.current);
        fallbackReloadRef.current = null;
      }
      setWaiting(false);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      if (fallbackReloadRef.current !== null) {
        window.clearTimeout(fallbackReloadRef.current);
      }
    };
  }, [markUpdateAvailable]);

  const dismiss = useCallback(() => {
    dismissPwaUpdate();
    setWaiting(false);
    waitingWorkerRef.current = null;
  }, []);

  const applyUpdate = useCallback(() => {
    applyingUpdateRef.current = true;

    fallbackReloadRef.current = applyServiceWorkerUpdate({
      getWaitingWorker: () =>
        waitingWorkerRef.current ?? registrationRef.current?.waiting ?? null,
      postSkipWaiting: (worker) => {
        worker.postMessage({ type: "SKIP_WAITING" });
      },
      reload: () => {
        applyingUpdateRef.current = false;
        if (fallbackReloadRef.current !== null) {
          window.clearTimeout(fallbackReloadRef.current);
          fallbackReloadRef.current = null;
        }
        window.location.reload();
      },
      scheduleFallbackReload: (callback, delayMs) =>
        window.setTimeout(callback, delayMs),
    });
  }, []);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-lg items-center gap-3 rounded-card border border-border bg-surface-card px-4 py-3 shadow-card sm:inset-x-auto sm:right-6"
    >
      <p className="min-w-0 flex-1 text-sm text-text-primary">
        A new version is ready.
      </p>
      <Button type="button" size="sm" onClick={applyUpdate}>
        Reload
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 shrink-0"
        onClick={dismiss}
        aria-label="Dismiss update notification"
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
