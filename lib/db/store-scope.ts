import type { Prisma } from "@prisma/client";

/** Active listings — excludes stores in the 90-day soft-delete grace window. */
export const storeNotDeletedWhere = {
  deletedAt: null,
} satisfies Prisma.StoreWhereInput;

export function mergeStoreWhere(
  where: Prisma.StoreWhereInput = {},
): Prisma.StoreWhereInput {
  const hasFilters = Object.keys(where).length > 0;
  if (!hasFilters) {
    return storeNotDeletedWhere;
  }
  return {
    AND: [storeNotDeletedWhere, where],
  };
}

/** Admin trash view — soft-deleted stores still within the restore window. */
export function mergeDeletedStoreWhere(
  where: Prisma.StoreWhereInput = {},
): Prisma.StoreWhereInput {
  const deletedOnly = { deletedAt: { not: null } } satisfies Prisma.StoreWhereInput;
  const hasFilters = Object.keys(where).length > 0;
  if (!hasFilters) return deletedOnly;
  return { AND: [deletedOnly, where] };
}

export const STORE_SOFT_DELETE_GRACE_DAYS = 90;

/** After purgeAt, the store purge job permanently removes visits, customers, and staff. */
export function purgeAtFromNow(now = new Date()): Date {
  const purgeAt = new Date(now);
  purgeAt.setDate(purgeAt.getDate() + STORE_SOFT_DELETE_GRACE_DAYS);
  return purgeAt;
}
