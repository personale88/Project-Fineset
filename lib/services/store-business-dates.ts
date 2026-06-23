import { prisma } from "@/lib/db/prisma";
import { mergeStoreWhere } from "@/lib/db/store-scope";

export type BusinessDateFields = {
  dataExpiryAt: Date | null;
  renewalDueAt: Date | null;
};

export async function findSiblingBusinessDates(
  email: string,
): Promise<BusinessDateFields | null> {
  const normalized = email.trim().toLowerCase();
  const sibling = await prisma.store.findFirst({
    where: mergeStoreWhere({
      businessOwnerEmail: { equals: normalized, mode: "insensitive" },
    }),
    select: { dataExpiryAt: true, renewalDueAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (!sibling) return null;
  return {
    dataExpiryAt: sibling.dataExpiryAt,
    renewalDueAt: sibling.renewalDueAt,
  };
}

/** Keeps subscription dates aligned for all stores under the same business owner email. */
export async function syncBusinessDatesForEmail(
  email: string | null | undefined,
  dates: Partial<BusinessDateFields>,
): Promise<void> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;

  const patch: Partial<BusinessDateFields> = {};
  if (dates.dataExpiryAt !== undefined) patch.dataExpiryAt = dates.dataExpiryAt;
  if (dates.renewalDueAt !== undefined) patch.renewalDueAt = dates.renewalDueAt;
  if (Object.keys(patch).length === 0) return;

  await prisma.store.updateMany({
    where: mergeStoreWhere({
      businessOwnerEmail: { equals: normalized, mode: "insensitive" },
    }),
    data: patch,
  });
}
