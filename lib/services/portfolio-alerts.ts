import { prisma } from "@/lib/db/prisma";
import { mergeStoreWhere } from "@/lib/db/store-scope";

export interface PortfolioAlert {
  type: "overdue_follow_ups" | "low_conversion";
  storeId: string;
  storeName: string;
  count?: number;
  message: string;
}

export async function getPortfolioAlerts(ownerEmail: string): Promise<PortfolioAlert[]> {
  const normalized = ownerEmail.trim().toLowerCase();
  const stores = await prisma.store.findMany({
    where: mergeStoreWhere({
      OR: [{ businessOwnerEmail: { equals: normalized, mode: "insensitive" } }],
    }),
    select: { id: true, name: true },
  });

  const alerts: PortfolioAlert[] = [];

  for (const store of stores) {
    const overdueCount = await prisma.followUp.count({
      where: {
        status: "OPEN",
        followUpDate: { lt: new Date() },
        OR: [{ visit: { storeId: store.id } }, { fieldSale: { storeId: store.id } }],
      },
    });

    if (overdueCount > 0) {
      alerts.push({
        type: "overdue_follow_ups",
        storeId: store.id,
        storeName: store.name,
        count: overdueCount,
        message: `${overdueCount} overdue follow-up${overdueCount === 1 ? "" : "s"}`,
      });
    }
  }

  return alerts;
}
