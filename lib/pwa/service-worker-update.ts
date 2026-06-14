export const PWA_UPDATE_DISMISS_KEY = "fineset-pwa-update-dismissed";

export interface ApplyServiceWorkerUpdateDeps {
  getWaitingWorker: () => ServiceWorker | null | undefined;
  postSkipWaiting: (worker: ServiceWorker) => void;
  reload: () => void;
  scheduleFallbackReload: (callback: () => void, delayMs: number) => number;
  fallbackDelayMs?: number;
}

export function isPwaUpdateDismissed(
  getDismissed: () => string | null = () =>
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(PWA_UPDATE_DISMISS_KEY)
      : null,
): boolean {
  return getDismissed() === "1";
}

export function dismissPwaUpdate(
  setDismissed: (value: string) => void = (value) =>
    sessionStorage.setItem(PWA_UPDATE_DISMISS_KEY, value),
): void {
  setDismissed("1");
}

/**
 * Activates a waiting service worker. Returns a fallback timer id when a worker
 * was messaged; clear it after controllerchange to avoid a duplicate reload.
 */
export function applyServiceWorkerUpdate(
  deps: ApplyServiceWorkerUpdateDeps,
): number | null {
  const worker = deps.getWaitingWorker();
  if (!worker) {
    deps.reload();
    return null;
  }

  deps.postSkipWaiting(worker);

  return deps.scheduleFallbackReload(
    deps.reload,
    deps.fallbackDelayMs ?? 2000,
  );
}
