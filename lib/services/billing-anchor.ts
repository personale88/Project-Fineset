import { prisma } from "@/lib/db/prisma";
import { mergeStoreWhere } from "@/lib/db/store-scope";
import { resolveBusinessBillingAnchor } from "@/lib/billing/activation-cycle";
import { normalizeBusinessEmail } from "@/lib/utils/group-stores-by-business";

export async function listStoreActivationsForBusinessKey(
  businessKey: string,
): Promise<Array<{ id: string; createdAt: Date }>> {
  if (businessKey.startsWith("store:")) {
    const storeId = businessKey.slice("store:".length);
    const store = await prisma.store.findFirst({
      where: mergeStoreWhere({ id: storeId }),
      select: { id: true, createdAt: true },
    });
    return store ? [store] : [];
  }

  const email = normalizeBusinessEmail(businessKey);
  if (!email) return [];

  return prisma.store.findMany({
    where: mergeStoreWhere({ businessOwnerEmail: email }),
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function resolveBillingAnchorForBusinessKey(
  businessKey: string,
  cachedAnchor: Date | string | null | undefined = null,
): Promise<Date | null> {
  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: { billingAnchorAt: true },
  });
  if (account?.billingAnchorAt) {
    const dbAnchor = new Date(account.billingAnchorAt);
    if (!Number.isNaN(dbAnchor.getTime())) return dbAnchor;
  }

  if (cachedAnchor) {
    const cached = new Date(cachedAnchor);
    if (!Number.isNaN(cached.getTime())) return cached;
  }

  const stores = await listStoreActivationsForBusinessKey(businessKey);
  return resolveBusinessBillingAnchor(stores);
}

export async function syncBillingAnchorForBusinessKey(
  businessKey: string,
): Promise<Date | null> {
  const anchor = await resolveBillingAnchorForBusinessKey(businessKey);
  if (!anchor) return null;

  await prisma.billingBusinessAccount.updateMany({
    where: { businessKey },
    data: { billingAnchorAt: anchor },
  });

  return anchor;
}
