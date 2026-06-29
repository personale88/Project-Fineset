import type { PlatformAutomationConfig } from "@/lib/automation/types";

export function serializeAutomationConfig(config: PlatformAutomationConfig): string {
  return JSON.stringify(config);
}

/**
 * Decide whether incoming server config should replace the local draft.
 * Preserves unsaved edits when the draft no longer matches the last synced snapshot.
 */
export function shouldApplyAutomationConfigSync(params: {
  incoming: PlatformAutomationConfig;
  current: PlatformAutomationConfig;
  lastSyncedSnapshot: string | null;
  userHasEditedDraft?: boolean;
}): { apply: true; snapshot: string } | { apply: false } {
  const incomingSnapshot = serializeAutomationConfig(params.incoming);

  if (incomingSnapshot === params.lastSyncedSnapshot) {
    return { apply: false };
  }

  if (params.lastSyncedSnapshot === null) {
    if (params.userHasEditedDraft) {
      return { apply: false };
    }
    return { apply: true, snapshot: incomingSnapshot };
  }

  if (serializeAutomationConfig(params.current) !== params.lastSyncedSnapshot) {
    return { apply: false };
  }

  return { apply: true, snapshot: incomingSnapshot };
}

/**
 * Keep a just-saved config when a stale refetch tries to overwrite the cache
 * while the draft still matches the saved response.
 */
export function shouldKeepAuthoritativeAutomationConfig(params: {
  incoming: PlatformAutomationConfig;
  current: PlatformAutomationConfig;
  authoritative: PlatformAutomationConfig;
}): boolean {
  const incomingSnapshot = serializeAutomationConfig(params.incoming);
  const authoritativeSnapshot = serializeAutomationConfig(params.authoritative);
  const currentSnapshot = serializeAutomationConfig(params.current);

  return incomingSnapshot !== authoritativeSnapshot && currentSnapshot === authoritativeSnapshot;
}
