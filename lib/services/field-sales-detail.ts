import { prisma } from "@/lib/db/prisma";
import { decryptFieldSalePii } from "@/lib/services/field-sales";
import type { FieldSaleListItem } from "@/types";

export async function getFieldSaleById(
  id: string,
  storeId?: string,
): Promise<(FieldSaleListItem & { staffId: string; createdAt: string }) | null> {
  const fieldSale = await prisma.fieldSale.findFirst({
    where: {
      id,
      ...(storeId ? { storeId } : {}),
    },
    include: {
      staff: { select: { id: true, name: true } },
      store: { select: { id: true, name: true } },
    },
  });

  if (!fieldSale) return null;

  const decrypted = decryptFieldSalePii(fieldSale);

  return {
    id: fieldSale.id,
    activityDate: fieldSale.activityDate.toISOString(),
    activityDateLabel: fieldSale.activityDate.toISOString(),
    staffId: fieldSale.staff.id,
    staffName: fieldSale.staff.name,
    storeId: fieldSale.store.id,
    storeName: fieldSale.store.name,
    customerName: decrypted.customerName,
    customerPhone: decrypted.customerPhone,
    customerType: fieldSale.customerType,
    activityType: fieldSale.activityType,
    locationLabel: fieldSale.locationLabel,
    schemesPitched: fieldSale.schemesPitched,
    enrollmentOutcome: fieldSale.enrollmentOutcome,
    monthlyCommitment: fieldSale.monthlyCommitment,
    intentTier: fieldSale.intentTier,
    reasonNoEnrollment: fieldSale.reasonNoEnrollment,
    followUpNeeded: fieldSale.followUpNeeded,
    followUpDate: fieldSale.followUpDate?.toISOString() ?? null,
    staffNotes: fieldSale.staffNotes,
    submissionLatitude: fieldSale.submissionLatitude,
    submissionLongitude: fieldSale.submissionLongitude,
    locationAccuracyMeters: fieldSale.locationAccuracyMeters,
    locationCapturedAt: fieldSale.locationCapturedAt?.toISOString() ?? null,
    locationStatus: fieldSale.locationStatus,
    locationAddress: fieldSale.locationAddress,
    distanceFromStoreMeters: fieldSale.distanceFromStoreMeters,
    outsideApprovedArea: fieldSale.outsideApprovedArea,
    createdAt: fieldSale.createdAt.toISOString(),
  };
}
