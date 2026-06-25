import { publishSyncEventToRedis } from "@/lib/sync/redis-sync-bridge";
import type { SyncEntity, SyncVersionPayload } from "@/lib/sync/version";

export type SyncListener = (payload: SyncVersionPayload) => void;

interface SyncEvent {
  scope: string;
  entities: SyncEntity[];
  timestamp: number;
}

/**
 * In-memory pub/sub for SSE sync events on the current instance.
 * Cross-instance fan-out uses Upstash Redis keys (see redis-sync-bridge.ts).
 */
class SyncBroadcaster {
  private listeners = new Map<string, Set<SyncListener>>();

  subscribe(scope: string, listener: SyncListener): () => void {
    const key = scope;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);

    return () => {
      this.listeners.get(key)?.delete(listener);
    };
  }

  broadcast(event: SyncEvent): void {
    const payload: SyncVersionPayload = {
      version: `${event.scope}:${event.timestamp}:${event.entities.sort().join(",")}`,
      scope: event.scope,
      entities: event.entities,
      lastChangedAt: new Date(event.timestamp).toISOString(),
    };

    const scopes = [event.scope, "all"];
    for (const scope of scopes) {
      for (const listener of this.listeners.get(scope) ?? []) {
        listener(payload);
      }
    }
  }
}

export const syncBroadcaster = new SyncBroadcaster();

function buildSyncPayload(
  scope: string,
  entities: SyncEntity[],
  timestamp: number,
): SyncVersionPayload {
  return {
    version: `${scope}:${timestamp}:${entities.slice().sort().join(",")}`,
    scope,
    entities,
    lastChangedAt: new Date(timestamp).toISOString(),
  };
}

export function broadcastSyncEvent(
  storeId: string | null,
  entities: SyncEntity[],
): void {
  const scope = storeId ?? "all";
  const timestamp = Date.now();
  syncBroadcaster.broadcast({ scope, entities, timestamp });
  void publishSyncEventToRedis(buildSyncPayload(scope, entities, timestamp));
}
