import { prisma } from "@/lib/db/prisma";

/** Deletes one named integration-test store and related rows only. */
export async function cleanupStoreFixtureByName(storeName: string): Promise<void> {
  const stores = await prisma.store.findMany({
    where: { name: storeName },
    select: { id: true },
  });
  const storeIds = stores.map((store) => store.id);
  if (storeIds.length === 0) return;

  await prisma.correctionRequest.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.importHistory.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.visit.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.fieldSale.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.customer.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.appUser.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.authAuditLog.deleteMany({
    where: { email: { endsWith: "@test.local" } },
  });
  await prisma.staff.deleteMany({
    where: { storeId: { in: storeIds } },
  });
  await prisma.store.deleteMany({
    where: { id: { in: storeIds } },
  });
}
