import { describe, expect, it, vi } from "vitest";
import {
  applyServiceWorkerUpdate,
  dismissPwaUpdate,
  isPwaUpdateDismissed,
  PWA_UPDATE_DISMISS_KEY,
} from "@/lib/pwa/service-worker-update";

describe("isPwaUpdateDismissed", () => {
  it("returns true when session flag is set", () => {
    expect(isPwaUpdateDismissed(() => "1")).toBe(true);
  });

  it("returns false when session flag is absent", () => {
    expect(isPwaUpdateDismissed(() => null)).toBe(false);
  });
});

describe("dismissPwaUpdate", () => {
  it("stores the dismiss flag", () => {
    const setDismissed = vi.fn();
    dismissPwaUpdate(setDismissed);
    expect(setDismissed).toHaveBeenCalledWith("1");
  });
});

describe("applyServiceWorkerUpdate", () => {
  it("reloads immediately when no waiting worker exists", () => {
    const reload = vi.fn();
    const postSkipWaiting = vi.fn();

    const fallbackId = applyServiceWorkerUpdate({
      getWaitingWorker: () => null,
      postSkipWaiting,
      reload,
      scheduleFallbackReload: vi.fn(() => 99),
    });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(postSkipWaiting).not.toHaveBeenCalled();
    expect(fallbackId).toBeNull();
  });

  it("messages the waiting worker and schedules a reload fallback", () => {
    const reload = vi.fn();
    const postSkipWaiting = vi.fn();
    const worker = { postMessage: vi.fn() } as unknown as ServiceWorker;

    const fallbackId = applyServiceWorkerUpdate({
      getWaitingWorker: () => worker,
      postSkipWaiting,
      reload,
      scheduleFallbackReload: (_callback, delayMs) => {
        expect(delayMs).toBe(2000);
        return 42;
      },
      fallbackDelayMs: 2000,
    });

    expect(postSkipWaiting).toHaveBeenCalledWith(worker);
    expect(reload).not.toHaveBeenCalled();
    expect(fallbackId).toBe(42);
  });
});

describe("PWA_UPDATE_DISMISS_KEY", () => {
  it("uses a stable storage key", () => {
    expect(PWA_UPDATE_DISMISS_KEY).toBe("fineset-pwa-update-dismissed");
  });
});
