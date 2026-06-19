import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import { decryptVisitPii, prepareCustomerPii } from "@/lib/services/pii";
import { broadcastSyncEvent } from "@/lib/sync/broadcaster";
import type {
  StaffAmendFieldSaleInput,
  StaffAmendVisitInput,
} from "@/lib/validations/staff-amend.schema";

export const STAFF_AMEND_WINDOW_MS = 72 * 60 * 60 * 1000;

export class StaffAmendError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StaffAmendError";
    this.status = status;
  }
}

function assertWithinAmendWindow(createdAt: Date) {
  if (Date.now() - createdAt.getTime() > STAFF_AMEND_WINDOW_MS) {
    throw new StaffAmendError(
      "This record can no longer be edited. Request a correction from your manager.",
      403,
    );
  }
}

export async function amendStaffVisit(params: {
  visitId: string;
  staffId: string;
  storeId: string;
  authId?: string | null;
  data: StaffAmendVisitInput;
}) {
  const visit = await prisma.visit.findFirst({
    where: { id: params.visitId, staffId: params.staffId, storeId: params.storeId },
    include: { followUp: true },
  });

  if (!visit) {
    throw new StaffAmendError("Visit not found", 404);
  }

  if (visit.importBatchId) {
    throw new StaffAmendError("Imported visits cannot be edited here.", 403);
  }

  assertWithinAmendWindow(visit.createdAt);

  const updateData: Record<string, unknown> = {};

  if (params.data.customerName || params.data.customerPhone) {
    const decrypted = decryptVisitPii(visit);
    const pii = prepareCustomerPii(
      params.data.customerName ?? decrypted.customerName,
      params.data.customerPhone ?? decrypted.customerPhone,
    );
    Object.assign(updateData, {
      customerName: pii.name,
      customerPhone: pii.phone,
      customerPhoneHash: pii.phoneHash,
      customerNameSearch: pii.nameSearch,
      phoneLast4: pii.phoneLast4,
    });
  }

  if (params.data.area !== undefined) updateData.area = params.data.area;
  if (params.data.address !== undefined) updateData.address = params.data.address;
  if (params.data.profession !== undefined) updateData.profession = params.data.profession;
  if (params.data.staffNotes !== undefined) updateData.staffNotes = params.data.staffNotes;
  if (params.data.followUpNeeded !== undefined) {
    updateData.followUpNeeded = params.data.followUpNeeded;
  }
  if (params.data.followUpDate !== undefined) {
    updateData.followUpDate = params.data.followUpDate;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextVisit = await tx.visit.update({
      where: { id: visit.id },
      data: updateData,
    });

    if (params.data.followUpNeeded !== undefined || params.data.followUpDate !== undefined) {
      const needed = params.data.followUpNeeded ?? visit.followUpNeeded;
      const date = params.data.followUpDate ?? visit.followUpDate;

      if (needed && date) {
        await tx.followUp.upsert({
          where: { visitId: visit.id },
          create: {
            visitId: visit.id,
            assignedStaffId: params.staffId,
            followUpDate: date,
            status: "OPEN",
            reason: "Amended from visit",
          },
          update: {
            followUpDate: date,
            status: "OPEN",
          },
        });
      } else if (!needed && visit.followUp) {
        await tx.followUp.update({
          where: { id: visit.followUp.id },
          data: { status: "CLOSED" },
        });
      }
    }

    return nextVisit;
  });

  await logAuthEvent({
    event: "STAFF_RECORD_AMENDED",
    authId: params.authId,
    metadata: {
      recordType: "visit",
      visitId: visit.id,
      storeId: params.storeId,
      staffId: params.staffId,
      fields: Object.keys(params.data),
    },
  });

  broadcastSyncEvent(params.storeId, ["visits", "followUps", "customers"]);
  return updated;
}

export async function amendStaffFieldSale(params: {
  fieldSaleId: string;
  staffId: string;
  storeId: string;
  authId?: string | null;
  data: StaffAmendFieldSaleInput;
}) {
  const fieldSale = await prisma.fieldSale.findFirst({
    where: { id: params.fieldSaleId, staffId: params.staffId, storeId: params.storeId },
    include: { followUp: true },
  });

  if (!fieldSale) {
    throw new StaffAmendError("Field sale not found", 404);
  }

  assertWithinAmendWindow(fieldSale.createdAt);

  const updateData: Record<string, unknown> = {};

  if (params.data.customerName || params.data.customerPhone) {
    const decrypted = decryptVisitPii(fieldSale);
    const pii = prepareCustomerPii(
      params.data.customerName ?? decrypted.customerName,
      params.data.customerPhone ?? decrypted.customerPhone,
    );
    Object.assign(updateData, {
      customerName: pii.name,
      customerPhone: pii.phone,
      customerPhoneHash: pii.phoneHash,
      customerNameSearch: pii.nameSearch,
      phoneLast4: pii.phoneLast4,
    });
  }

  if (params.data.area !== undefined) updateData.area = params.data.area;
  if (params.data.locationLabel !== undefined) {
    updateData.locationLabel = params.data.locationLabel;
  }
  if (params.data.staffNotes !== undefined) updateData.staffNotes = params.data.staffNotes;
  if (params.data.followUpNeeded !== undefined) {
    updateData.followUpNeeded = params.data.followUpNeeded;
  }
  if (params.data.followUpDate !== undefined) {
    updateData.followUpDate = params.data.followUpDate;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.fieldSale.update({
      where: { id: fieldSale.id },
      data: updateData,
    });

    if (params.data.followUpNeeded !== undefined || params.data.followUpDate !== undefined) {
      const needed = params.data.followUpNeeded ?? fieldSale.followUpNeeded;
      const date = params.data.followUpDate ?? fieldSale.followUpDate;

      if (needed && date) {
        await tx.followUp.upsert({
          where: { fieldSaleId: fieldSale.id },
          create: {
            fieldSaleId: fieldSale.id,
            assignedStaffId: params.staffId,
            followUpDate: date,
            status: "OPEN",
            reason: "Amended from field sale",
          },
          update: {
            followUpDate: date,
            status: "OPEN",
          },
        });
      } else if (!needed && fieldSale.followUp) {
        await tx.followUp.update({
          where: { id: fieldSale.followUp.id },
          data: { status: "CLOSED" },
        });
      }
    }

    return next;
  });

  await logAuthEvent({
    event: "STAFF_RECORD_AMENDED",
    authId: params.authId,
    metadata: {
      recordType: "field_sale",
      fieldSaleId: fieldSale.id,
      storeId: params.storeId,
      staffId: params.staffId,
      fields: Object.keys(params.data),
    },
  });

  broadcastSyncEvent(params.storeId, ["fieldSales", "followUps", "customers"]);
  return updated;
}
