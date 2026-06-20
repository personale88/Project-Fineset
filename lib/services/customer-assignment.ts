import { prisma } from "@/lib/db/prisma";
import { notifyPortalDataChangeNow } from "@/lib/sync/notify-change";

export class CustomerAssignmentError extends Error {
  constructor(
    message: string,
    readonly code: "NOT_FOUND" | "INVALID_STAFF" | "SAME_STAFF" | "INVALID_TARGET",
  ) {
    super(message);
    this.name = "CustomerAssignmentError";
  }
}

export interface AssignCustomerParams {
  storeId: string;
  targetStaffId: string;
  visitId?: string;
  fieldSaleId?: string;
  followUpId?: string;
}

export interface AssignCustomerResult {
  visitId: string | null;
  fieldSaleId: string | null;
  followUpId: string | null;
  previousStaffId: string;
  newStaffId: string;
  newStaffName: string;
  customerName: string;
}

function countTargets(params: AssignCustomerParams): number {
  return [params.visitId, params.fieldSaleId, params.followUpId].filter(Boolean).length;
}

async function assertActiveStaffInStore(staffId: string, storeId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, storeId, isActive: true },
    select: { id: true, name: true },
  });
  if (!staff) {
    throw new CustomerAssignmentError(
      "Selected staff member is not active in this store.",
      "INVALID_STAFF",
    );
  }
  return staff;
}


export async function assignCustomerToStaff(
  params: AssignCustomerParams,
): Promise<AssignCustomerResult> {
  const targetCount = countTargets(params);
  if (targetCount !== 1) {
    throw new CustomerAssignmentError(
      "Provide exactly one of visitId, fieldSaleId, or followUpId.",
      "INVALID_TARGET",
    );
  }

  const targetStaff = await assertActiveStaffInStore(params.targetStaffId, params.storeId);

  if (params.visitId) {
    return assignVisitRecord(params.storeId, params.visitId, targetStaff);
  }
  if (params.fieldSaleId) {
    return assignFieldSale(params.storeId, params.fieldSaleId, targetStaff);
  }
  return assignFollowUp(params.storeId, params.followUpId!, targetStaff);
}

async function assignVisitRecord(
  storeId: string,
  visitId: string,
  targetStaff: { id: string; name: string },
): Promise<AssignCustomerResult> {
  const visit = await prisma.visit.findFirst({
    where: { id: visitId, storeId },
    select: {
      id: true,
      staffId: true,
      customerName: true,
      followUp: { select: { id: true, status: true } },
    },
  });

  if (!visit) {
    throw new CustomerAssignmentError("Visit not found in this store.", "NOT_FOUND");
  }
  if (visit.staffId === targetStaff.id) {
    throw new CustomerAssignmentError(
      "This customer is already assigned to the selected staff member.",
      "SAME_STAFF",
    );
  }

  const previousStaffId = visit.staffId;

  await prisma.$transaction(async (tx) => {
    await tx.visit.update({
      where: { id: visitId },
      data: { staffId: targetStaff.id },
    });
    if (visit.followUp?.status === "OPEN") {
      await tx.followUp.update({
        where: { id: visit.followUp.id },
        data: { assignedStaffId: targetStaff.id },
      });
    }
  });

  notifyPortalDataChangeNow(storeId, ["visits", "followUps", "callLogs", "staff"]);

  return {
    visitId,
    fieldSaleId: null,
    followUpId: visit.followUp?.id ?? null,
    previousStaffId,
    newStaffId: targetStaff.id,
    newStaffName: targetStaff.name,
    customerName: visit.customerName,
  };
}

async function assignFieldSale(
  storeId: string,
  fieldSaleId: string,
  targetStaff: { id: string; name: string },
): Promise<AssignCustomerResult> {
  const fieldSale = await prisma.fieldSale.findFirst({
    where: { id: fieldSaleId, storeId },
    select: {
      id: true,
      staffId: true,
      customerName: true,
      followUp: { select: { id: true, status: true } },
    },
  });

  if (!fieldSale) {
    throw new CustomerAssignmentError("Field sale not found in this store.", "NOT_FOUND");
  }
  if (fieldSale.staffId === targetStaff.id) {
    throw new CustomerAssignmentError(
      "This customer is already assigned to the selected staff member.",
      "SAME_STAFF",
    );
  }

  const previousStaffId = fieldSale.staffId;

  await prisma.$transaction(async (tx) => {
    await tx.fieldSale.update({
      where: { id: fieldSaleId },
      data: { staffId: targetStaff.id },
    });
    if (fieldSale.followUp?.status === "OPEN") {
      await tx.followUp.update({
        where: { id: fieldSale.followUp.id },
        data: { assignedStaffId: targetStaff.id },
      });
    }
  });

  notifyPortalDataChangeNow(storeId, ["fieldSales", "followUps", "callLogs", "staff"]);

  return {
    visitId: null,
    fieldSaleId,
    followUpId: fieldSale.followUp?.id ?? null,
    previousStaffId,
    newStaffId: targetStaff.id,
    newStaffName: targetStaff.name,
    customerName: fieldSale.customerName,
  };
}

async function assignFollowUp(
  storeId: string,
  followUpId: string,
  targetStaff: { id: string; name: string },
): Promise<AssignCustomerResult> {
  const followUp = await prisma.followUp.findFirst({
    where: {
      id: followUpId,
      OR: [{ visit: { storeId } }, { fieldSale: { storeId } }],
    },
    select: {
      id: true,
      assignedStaffId: true,
      status: true,
      visit: {
        select: {
          id: true,
          staffId: true,
          customerName: true,
        },
      },
      fieldSale: {
        select: {
          id: true,
          staffId: true,
          customerName: true,
        },
      },
    },
  });

  if (!followUp) {
    throw new CustomerAssignmentError("Follow-up not found in this store.", "NOT_FOUND");
  }

  const parent = followUp.visit ?? followUp.fieldSale;
  if (!parent) {
    throw new CustomerAssignmentError("Follow-up has no linked customer record.", "NOT_FOUND");
  }

  const currentOwnerId = parent.staffId;
  if (currentOwnerId === targetStaff.id && followUp.assignedStaffId === targetStaff.id) {
    throw new CustomerAssignmentError(
      "This customer is already assigned to the selected staff member.",
      "SAME_STAFF",
    );
  }

  const previousStaffId = currentOwnerId;

  await prisma.$transaction(async (tx) => {
    if (followUp.visit) {
      await tx.visit.update({
        where: { id: followUp.visit.id },
        data: { staffId: targetStaff.id },
      });
    } else if (followUp.fieldSale) {
      await tx.fieldSale.update({
        where: { id: followUp.fieldSale.id },
        data: { staffId: targetStaff.id },
      });
    }

    if (followUp.status === "OPEN") {
      await tx.followUp.update({
        where: { id: followUpId },
        data: { assignedStaffId: targetStaff.id },
      });
    }
  });

  notifyPortalDataChangeNow(storeId, [
    "visits",
    "fieldSales",
    "followUps",
    "callLogs",
    "staff",
  ]);

  return {
    visitId: followUp.visit?.id ?? null,
    fieldSaleId: followUp.fieldSale?.id ?? null,
    followUpId,
    previousStaffId,
    newStaffId: targetStaff.id,
    newStaffName: targetStaff.name,
    customerName: parent.customerName,
  };
}

export async function bulkAssignFollowUps(params: {
  storeId: string;
  targetStaffId: string;
  followUpIds: string[];
}): Promise<{ assigned: number; skipped: number }> {
  let assigned = 0;
  let skipped = 0;

  for (const followUpId of params.followUpIds) {
    try {
      await assignCustomerToStaff({
        storeId: params.storeId,
        followUpId,
        targetStaffId: params.targetStaffId,
      });
      assigned += 1;
    } catch (error) {
      if (error instanceof CustomerAssignmentError && error.code === "SAME_STAFF") {
        skipped += 1;
        continue;
      }
      throw error;
    }
  }

  return { assigned, skipped };
}
