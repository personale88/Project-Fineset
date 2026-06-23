import { prisma } from "@/lib/db/prisma";
import { listOwnedStoresForBusinessOwner, normalizeManagerEmail } from "@/lib/services/manager-stores";
import type { AppSession } from "@/types";
import type { Prisma } from "@prisma/client";

export type SyncEntity =
  | "visits"
  | "fieldSales"
  | "staff"
  | "customers"
  | "followUps"
  | "callLogs"
  | "stores";

export interface SyncVersionPayload {
  version: string;
  scope: string;
  entities: SyncEntity[];
  lastChangedAt: string;
}

function resolveStoreScope(session: AppSession): string | undefined {
  if (session.role === "STAFF") return session.storeId;
  if (session.role === "STORE_MANAGER" || session.role === "BUSINESS_OWNER") {
    return session.storeId;
  }
  return undefined;
}

async function getMaxTimestamp(
  where: Prisma.VisitWhereInput | undefined,
): Promise<Date> {
  const agg = await prisma.visit.aggregate({
    where,
    _max: { updatedAt: true },
  });
  return agg._max.updatedAt ?? new Date(0);
}

export async function computeSyncVersion(
  session: AppSession,
  entities: SyncEntity[] = [
    "visits",
    "fieldSales",
    "staff",
    "customers",
    "followUps",
    "callLogs",
    "stores",
  ],
): Promise<SyncVersionPayload> {
  const storeId = resolveStoreScope(session);
  const scope = storeId ?? "all";

  const visitWhere: Prisma.VisitWhereInput | undefined = storeId
    ? { storeId }
    : undefined;
  const fieldSaleWhere: Prisma.FieldSaleWhereInput | undefined = storeId
    ? { storeId }
    : undefined;
  const staffWhere: Prisma.StaffWhereInput | undefined = storeId
    ? { storeId }
    : undefined;
  const customerWhere: Prisma.CustomerWhereInput | undefined = storeId
    ? { storeId }
    : undefined;
  const followUpWhere: Prisma.FollowUpWhereInput | undefined = storeId
    ? {
        OR: [
          { visit: { storeId } },
          { fieldSale: { storeId } },
        ],
      }
    : undefined;
  const callLogWhere: Prisma.StaffCallLogWhereInput | undefined = storeId
    ? { visit: { storeId } }
    : undefined;

  const timestamps: Date[] = [];

  if (entities.includes("visits")) {
    const agg = await prisma.visit.aggregate({
      where: visitWhere,
      _max: { updatedAt: true },
    });
    if (agg._max.updatedAt) timestamps.push(agg._max.updatedAt);
  }

  if (entities.includes("fieldSales")) {
    const agg = await prisma.fieldSale.aggregate({
      where: fieldSaleWhere,
      _max: { updatedAt: true },
    });
    if (agg._max.updatedAt) timestamps.push(agg._max.updatedAt);
  }

  if (entities.includes("staff")) {
    const agg = await prisma.staff.aggregate({
      where: staffWhere,
      _max: { updatedAt: true },
    });
    if (agg._max.updatedAt) timestamps.push(agg._max.updatedAt);
  }

  if (entities.includes("customers")) {
    const agg = await prisma.customer.aggregate({
      where: customerWhere,
      _max: { updatedAt: true },
    });
    if (agg._max.updatedAt) timestamps.push(agg._max.updatedAt);
  }

  if (entities.includes("followUps")) {
    const agg = await prisma.followUp.aggregate({
      where: followUpWhere,
      _max: { updatedAt: true },
    });
    if (agg._max.updatedAt) timestamps.push(agg._max.updatedAt);
  }

  if (entities.includes("callLogs")) {
    const agg = await prisma.staffCallLog.aggregate({
      where: callLogWhere,
      _max: { createdAt: true },
    });
    if (agg._max.createdAt) timestamps.push(agg._max.createdAt);
  }

  if (entities.includes("stores")) {
    const agg = storeId
      ? await prisma.store.aggregate({
          where: { id: storeId },
          _max: { updatedAt: true },
        })
      : await prisma.store.aggregate({ _max: { updatedAt: true } });
    if (agg._max.updatedAt) timestamps.push(agg._max.updatedAt);
  }

  const lastChangedAt =
    timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((d) => d.getTime())))
      : new Date(0);

  const version = [scope, lastChangedAt.getTime(), entities.sort().join(",")].join(
    ":",
  );

  return {
    version,
    scope,
    entities,
    lastChangedAt: lastChangedAt.toISOString(),
  };
}

/**
 * Fast sync fingerprint used for SSE open + heartbeat polling.
 * Aggregates latest change timestamps across all portal entities.
 */
export async function computeSyncVersionLight(
  session: AppSession,
): Promise<SyncVersionPayload> {
  const scopeFilter = await resolveSyncScopeFilters(session);
  const scope = scopeFilter.scope;

  const [
    visitAgg,
    fieldSaleAgg,
    staffAgg,
    customerAgg,
    followUpAgg,
    callLogAgg,
    storeAgg,
  ] = await Promise.all([
    prisma.visit.aggregate({
      where: scopeFilter.visitWhere,
      _max: { updatedAt: true },
    }),
    prisma.fieldSale.aggregate({
      where: scopeFilter.fieldSaleWhere,
      _max: { updatedAt: true },
    }),
    prisma.staff.aggregate({
      where: scopeFilter.staffWhere,
      _max: { updatedAt: true },
    }),
    prisma.customer.aggregate({
      where: scopeFilter.customerWhere,
      _max: { updatedAt: true },
    }),
    prisma.followUp.aggregate({
      where: scopeFilter.followUpWhere,
      _max: { updatedAt: true },
    }),
    prisma.staffCallLog.aggregate({
      where: scopeFilter.callLogWhere,
      _max: { createdAt: true },
    }),
    prisma.store.aggregate({
      where: scopeFilter.storeWhere,
      _max: { updatedAt: true },
    }),
  ]);

  const timestamps = [
    visitAgg._max.updatedAt,
    fieldSaleAgg._max.updatedAt,
    staffAgg._max.updatedAt,
    customerAgg._max.updatedAt,
    followUpAgg._max.updatedAt,
    callLogAgg._max.createdAt,
    storeAgg._max.updatedAt,
  ].filter((value): value is Date => value instanceof Date);

  const lastChangedAt =
    timestamps.length > 0
      ? new Date(Math.max(...timestamps.map((value) => value.getTime())))
      : new Date(0);

  const entities: SyncEntity[] = [
    "visits",
    "fieldSales",
    "staff",
    "customers",
    "followUps",
    "callLogs",
    "stores",
  ];
  const version = [scope, lastChangedAt.getTime(), "light-v2"].join(":");

  return {
    version,
    scope,
    entities,
    lastChangedAt: lastChangedAt.toISOString(),
  };
}

/** Lightweight version check for /api/sync/state */
export async function getSyncState(session: AppSession) {
  const payload = await computeSyncVersionLight(session);
  return {
    version: payload.version,
    lastChangedAt: payload.lastChangedAt,
    scope: payload.scope,
    counts: {
      visits: 0,
      fieldSales: 0,
      staff: 0,
      customers: 0,
      followUps: 0,
      callLogs: 0,
      stores: 0,
    },
  };
}

export { getMaxTimestamp };

interface SyncScopeFilters {
  scope: string;
  visitWhere?: Prisma.VisitWhereInput;
  fieldSaleWhere?: Prisma.FieldSaleWhereInput;
  staffWhere?: Prisma.StaffWhereInput;
  customerWhere?: Prisma.CustomerWhereInput;
  followUpWhere?: Prisma.FollowUpWhereInput;
  callLogWhere?: Prisma.StaffCallLogWhereInput;
  storeWhere?: Prisma.StoreWhereInput;
}

async function resolveSyncScopeFilters(session: AppSession): Promise<SyncScopeFilters> {
  if (session.role === "MASTER_ADMIN" || session.role === "PLATFORM_ADMIN") {
    return { scope: "all" };
  }

  if (session.role === "BUSINESS_OWNER") {
    const stores = await listOwnedStoresForBusinessOwner(
      session.email,
      session.storeId,
    );
    const storeIds = stores.map((store) => store.id);
    if (storeIds.length === 0) {
      storeIds.push(session.storeId);
    }

    return {
      scope: `owner:${normalizeManagerEmail(session.email)}`,
      visitWhere: { storeId: { in: storeIds } },
      fieldSaleWhere: { storeId: { in: storeIds } },
      staffWhere: { storeId: { in: storeIds } },
      customerWhere: { storeId: { in: storeIds } },
      followUpWhere: {
        OR: [
          { visit: { storeId: { in: storeIds } } },
          { fieldSale: { storeId: { in: storeIds } } },
        ],
      },
      callLogWhere: { visit: { storeId: { in: storeIds } } },
      storeWhere: { id: { in: storeIds } },
    };
  }

  const storeId = session.storeId;
  return {
    scope: storeId,
    visitWhere: { storeId },
    fieldSaleWhere: { storeId },
    staffWhere: { storeId },
    customerWhere: { storeId },
    followUpWhere: {
      OR: [{ visit: { storeId } }, { fieldSale: { storeId } }],
    },
    callLogWhere: { visit: { storeId } },
    storeWhere: { id: storeId },
  };
}
