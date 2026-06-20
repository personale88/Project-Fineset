import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { normalizeManagerEmail } from "@/lib/services/manager-stores";
import { broadcastSyncEvent } from "@/lib/sync/broadcaster";
import type { SyncEntity } from "@/lib/sync/version";

const ownerEmailByStoreId = new Map<string, string | null>();

async function resolveOwnerEmail(
  storeId: string,
  ownerEmail?: string | null,
): Promise<string | null> {
  if (ownerEmail !== undefined) {
    const normalized = ownerEmail?.trim()
      ? normalizeManagerEmail(ownerEmail)
      : null;
    ownerEmailByStoreId.set(storeId, normalized);
    return normalized;
  }

  if (ownerEmailByStoreId.has(storeId)) {
    return ownerEmailByStoreId.get(storeId) ?? null;
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { businessOwnerEmail: true },
  });
  const normalized = store?.businessOwnerEmail
    ? normalizeManagerEmail(store.businessOwnerEmail)
    : null;
  ownerEmailByStoreId.set(storeId, normalized);
  return normalized;
}

function revalidateServerCaches(storeId: string, entities: SyncEntity[]): void {
  const analyticsEntities: SyncEntity[] = [
    "visits",
    "fieldSales",
    "staff",
    "followUps",
    "callLogs",
    "stores",
    "customers",
  ];

  if (entities.some((entity) => analyticsEntities.includes(entity))) {
    revalidateTag("analytics", { expire: 0 });
    revalidateTag(`store:${storeId}`, { expire: 0 });
  }

  if (entities.includes("stores")) {
    revalidateTag("store-list", { expire: 0 });
  }
}

/**
 * Single server-side entry point after any portal mutation.
 * Busts Next.js caches, fans out SSE to store/admin/owner scopes.
 */
export async function notifyPortalDataChange(
  storeId: string,
  entities: SyncEntity[],
  options?: { ownerEmail?: string | null },
): Promise<void> {
  const unique = [...new Set(entities)];
  if (unique.length === 0) return;

  broadcastSyncEvent(storeId, unique);

  const owner = await resolveOwnerEmail(storeId, options?.ownerEmail);
  if (owner) {
    broadcastSyncEvent(`owner:${owner}`, unique);
  }

  revalidateServerCaches(storeId, unique);
}

/** Fire-and-forget wrapper for sync service code paths. */
export function notifyPortalDataChangeNow(
  storeId: string,
  entities: SyncEntity[],
  options?: { ownerEmail?: string | null },
): void {
  void notifyPortalDataChange(storeId, entities, options);
}

export function importSyncEntities(featureKey: string): SyncEntity[] {
  if (featureKey === "call_log") {
    return ["callLogs", "visits", "customers", "followUps"];
  }
  return ["visits", "customers", "followUps"];
}

export function invalidateStoreDerivedCaches(options?: {
  storeId?: string;
  businessOwnerEmail?: string | null;
}): void {
  if (!options?.storeId) {
    revalidateTag("analytics", { expire: 0 });
    revalidateTag("store-list", { expire: 0 });
    broadcastSyncEvent(null, ["stores"]);
    return;
  }

  notifyPortalDataChangeNow(options.storeId, ["stores"], {
    ownerEmail: options.businessOwnerEmail,
  });
}
