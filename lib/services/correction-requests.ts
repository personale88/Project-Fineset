import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import { notifyPortalDataChangeNow } from "@/lib/sync/notify-change";
import type { StaffCorrectionRequestInput } from "@/lib/validations/staff-amend.schema";

export class CorrectionRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CorrectionRequestError";
    this.status = status;
  }
}

export async function createCorrectionRequest(params: {
  staffId: string;
  storeId: string;
  authId?: string | null;
  data: StaffCorrectionRequestInput;
}) {
  if (!params.data.visitId && !params.data.fieldSaleId) {
    throw new CorrectionRequestError("visitId or fieldSaleId is required");
  }

  if (params.data.visitId) {
    const visit = await prisma.visit.findFirst({
      where: {
        id: params.data.visitId,
        staffId: params.staffId,
        storeId: params.storeId,
      },
      select: { id: true },
    });
    if (!visit) throw new CorrectionRequestError("Visit not found", 404);
  }

  if (params.data.fieldSaleId) {
    const fieldSale = await prisma.fieldSale.findFirst({
      where: {
        id: params.data.fieldSaleId,
        staffId: params.staffId,
        storeId: params.storeId,
      },
      select: { id: true },
    });
    if (!fieldSale) throw new CorrectionRequestError("Field sale not found", 404);
  }

  const request = await prisma.correctionRequest.create({
    data: {
      storeId: params.storeId,
      staffId: params.staffId,
      visitId: params.data.visitId,
      fieldSaleId: params.data.fieldSaleId,
      message: params.data.message,
    },
    include: {
      staff: { select: { name: true } },
    },
  });

  await logAuthEvent({
    event: "STAFF_CORRECTION_REQUEST",
    authId: params.authId,
    metadata: {
      requestId: request.id,
      storeId: params.storeId,
      staffId: params.staffId,
      visitId: params.data.visitId,
      fieldSaleId: params.data.fieldSaleId,
    },
  });

  notifyPortalDataChangeNow(params.storeId, ["visits", "fieldSales"]);
  return request;
}

export async function listOpenCorrectionRequests(storeId: string) {
  return prisma.correctionRequest.findMany({
    where: { storeId, status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      staff: { select: { id: true, name: true } },
      visit: { select: { id: true, customerName: true } },
      fieldSale: { select: { id: true, customerName: true } },
    },
  });
}

export async function resolveCorrectionRequest(params: {
  id: string;
  storeId: string;
}) {
  const existing = await prisma.correctionRequest.findFirst({
    where: { id: params.id, storeId: params.storeId, status: "OPEN" },
  });
  if (!existing) return null;

  const resolved = await prisma.correctionRequest.update({
    where: { id: existing.id },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  notifyPortalDataChangeNow(params.storeId, ["visits", "fieldSales"]);
  return resolved;
}
