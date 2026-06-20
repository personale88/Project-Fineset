import type { QueryClient } from "@tanstack/react-query";
import type { SyncEntity } from "@/lib/sync/version";

const ENTITY_QUERY_KEYS: Record<SyncEntity, string[][]> = {
  visits: [["visits"], ["analytics"], ["correction-requests"], ["manager-dashboard"], ["owner-dashboard"], ["store-work-queue"], ["store-activity"]],
  fieldSales: [["field-sales"], ["analytics"], ["manager-dashboard"], ["owner-dashboard"], ["store-work-queue"], ["store-activity"]],
  staff: [["staff"], ["manager-dashboard"], ["owner-dashboard"], ["manager-actor-status"], ["store-activity"]],
  customers: [["customers"]],
  followUps: [["follow-ups"], ["analytics"], ["staff-work-queue"], ["staff-digest"], ["manager-dashboard"], ["owner-dashboard"], ["store-work-queue"], ["store-activity"]],
  callLogs: [
    ["staff-calls"],
    ["staff-calls-filters"],
    ["portal-calls"],
    ["calls"],
    ["analytics"],
    ["staff-work-queue"],
    ["staff-digest"],
    ["manager-dashboard"],
    ["owner-dashboard"],
    ["store-work-queue"],
    ["store-activity"],
  ],
  stores: [["stores"], ["analytics"]],
};

export async function invalidateEntity(
  queryClient: QueryClient,
  entity: SyncEntity,
): Promise<void> {
  const keys = ENTITY_QUERY_KEYS[entity];
  await Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

export async function invalidateEntities(
  queryClient: QueryClient,
  entities: SyncEntity[],
): Promise<void> {
  const unique = [...new Set(entities)];
  await Promise.all(unique.map((entity) => invalidateEntity(queryClient, entity)));
}

/** Invalidate every portal query namespace (fallback). */
export async function invalidatePortalData(
  queryClient: QueryClient,
): Promise<void> {
  await invalidateEntities(queryClient, [
    "visits",
    "fieldSales",
    "staff",
    "customers",
    "followUps",
    "callLogs",
    "stores",
  ]);
}
