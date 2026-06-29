import { describe, expect, it } from "vitest";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { shouldApplyAutomationConfigSync, shouldKeepAuthoritativeAutomationConfig } from "@/lib/automation/draft-sync";
import type { PlatformAutomationConfig } from "@/lib/automation/types";

function snapshot(config: PlatformAutomationConfig): string {
  return JSON.stringify(config);
}

describe("shouldApplyAutomationConfigSync", () => {
  it("applies the first server payload on initial load", () => {
    const result = shouldApplyAutomationConfigSync({
      incoming: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      current: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      lastSyncedSnapshot: null,
    });

    expect(result).toEqual({
      apply: true,
      snapshot: snapshot(DEFAULT_PLATFORM_AUTOMATION_CONFIG),
    });
  });

  it("skips when incoming matches the last synced snapshot", () => {
    const synced = snapshot(DEFAULT_PLATFORM_AUTOMATION_CONFIG);

    expect(
      shouldApplyAutomationConfigSync({
        incoming: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        current: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        lastSyncedSnapshot: synced,
      }),
    ).toEqual({ apply: false });
  });

  it("preserves unsaved draft edits when config refetches", () => {
    const synced = snapshot(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
    const edited: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      billingCycle: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.billingCycle,
        cycleStartDay: 15,
      },
    };

    expect(
      shouldApplyAutomationConfigSync({
        incoming: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        current: edited,
        lastSyncedSnapshot: synced,
      }),
    ).toEqual({ apply: false });
  });

  it("applies a newer server config when the draft is still clean", () => {
    const synced = snapshot(DEFAULT_PLATFORM_AUTOMATION_CONFIG);
    const incoming: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    expect(
      shouldApplyAutomationConfigSync({
        incoming,
        current: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        lastSyncedSnapshot: synced,
      }),
    ).toEqual({ apply: true, snapshot: snapshot(incoming) });
  });

  it("preserves a toggled master switch before the first server sync", () => {
    const incoming: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    expect(
      shouldApplyAutomationConfigSync({
        incoming,
        current: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        lastSyncedSnapshot: null,
        userHasEditedDraft: true,
      }),
    ).toEqual({ apply: false });
  });
});

describe("shouldKeepAuthoritativeAutomationConfig", () => {
  it("keeps the saved config when a stale refetch arrives after save", () => {
    const saved: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };

    expect(
      shouldKeepAuthoritativeAutomationConfig({
        incoming: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        current: saved,
        authoritative: saved,
      }),
    ).toBe(true);
  });

  it("does not keep the saved config after the user edits the draft again", () => {
    const saved: PlatformAutomationConfig = {
      ...DEFAULT_PLATFORM_AUTOMATION_CONFIG,
      global: {
        ...DEFAULT_PLATFORM_AUTOMATION_CONFIG.global,
        enabled: true,
      },
    };
    const edited: PlatformAutomationConfig = {
      ...saved,
      billingCycle: {
        ...saved.billingCycle,
        cycleStartDay: 15,
      },
    };

    expect(
      shouldKeepAuthoritativeAutomationConfig({
        incoming: DEFAULT_PLATFORM_AUTOMATION_CONFIG,
        current: edited,
        authoritative: saved,
      }),
    ).toBe(false);
  });
});
