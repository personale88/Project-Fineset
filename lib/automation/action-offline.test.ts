import { describe, expect, it, afterEach } from "vitest";
import { ApiError } from "@/types";
import {
  isBrowserOffline,
  resolveAutomationActionError,
} from "@/lib/automation/action-offline";

const offlineMessage =
  "You are offline. Reconnect to save or run automation settings.";

function mockNavigatorOnline(online: boolean) {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
}

afterEach(() => {
  mockNavigatorOnline(true);
});

describe("isBrowserOffline", () => {
  it("returns true when navigator.onLine is false", () => {
    mockNavigatorOnline(false);
    expect(isBrowserOffline()).toBe(true);
  });

  it("returns false when navigator.onLine is true", () => {
    mockNavigatorOnline(true);
    expect(isBrowserOffline()).toBe(false);
  });
});

describe("resolveAutomationActionError", () => {
  it("returns the offline message when the browser is offline", () => {
    mockNavigatorOnline(false);
    expect(
      resolveAutomationActionError(new TypeError("Failed to fetch"), offlineMessage),
    ).toBe(offlineMessage);
  });

  it("returns API error messages when online", () => {
    mockNavigatorOnline(true);
    expect(
      resolveAutomationActionError(
        new ApiError(403, {
          message: "Automations are disabled. Enable automations or use preview run.",
        }),
        offlineMessage,
      ),
    ).toBe("Automations are disabled. Enable automations or use preview run.");
  });

  it("returns native error messages for network failures while online", () => {
    mockNavigatorOnline(true);
    expect(
      resolveAutomationActionError(new TypeError("Failed to fetch"), offlineMessage),
    ).toBe("Failed to fetch");
  });
});
