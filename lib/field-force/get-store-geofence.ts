import { prisma } from "@/lib/db/prisma";
import type { StoreGeofence } from "@/lib/field-force/location-capture";

export async function getStoreGeofence(storeId: string): Promise<StoreGeofence | null> {
  return prisma.store.findUnique({
    where: { id: storeId },
    select: {
      latitude: true,
      longitude: true,
      geofenceRadiusMeters: true,
    },
  });
}
