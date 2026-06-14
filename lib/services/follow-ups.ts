import { prisma } from "@/lib/db/prisma";
import type { FollowUpListItem } from "@/types";
import type { FollowUpStatus, Prisma } from "@prisma/client";
import { decryptVisitPii } from "@/lib/services/pii";

interface ListFollowUpsParams {
  storeId: string;
  staffId?: string;
  status?: FollowUpStatus;
  overdue?: boolean;
}

export async function listFollowUps(
  params: ListFollowUpsParams,
): Promise<FollowUpListItem[]> {
  const where: Prisma.FollowUpWhereInput = {
    OR: [
      { visit: { storeId: params.storeId } },
      { fieldSale: { storeId: params.storeId } },
    ],
  };

  if (params.staffId) {
    where.assignedStaffId = params.staffId;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.overdue) {
    where.followUpDate = { lt: new Date() };
    if (!params.status) {
      where.status = "OPEN";
    }
  }

  const followUps = await prisma.followUp.findMany({
    where,
    orderBy: { followUpDate: "asc" },
    include: {
      visit: {
        select: {
          customerName: true,
          customerPhone: true,
        },
      },
      fieldSale: {
        select: {
          customerName: true,
          customerPhone: true,
        },
      },
    },
  });

  const staffIds = Array.from(new Set(followUps.map((f) => f.assignedStaffId)));
  const staffMembers = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true },
  });
  const staffMap = new Map(staffMembers.map((s) => [s.id, s.name]));

  return followUps.map((f) => {
    const source = f.visit ?? f.fieldSale;
    const decrypted = source
      ? decryptVisitPii({
          customerName: source.customerName,
          customerPhone: source.customerPhone,
        })
      : { customerName: "Unknown", customerPhone: "" };

    return {
      id: f.id,
      visitId: f.visitId,
      customerName: decrypted.customerName,
      customerPhone: decrypted.customerPhone,
      assignedStaffName: staffMap.get(f.assignedStaffId) ?? "Unknown",
      followUpDate: f.followUpDate.toISOString(),
      reason: f.reason,
      callOutcome: f.callOutcome,
      status: f.status,
    };
  });
}

export async function updateFollowUpStatus(
  followUpId: string,
  storeId: string,
  status: FollowUpStatus,
  staffId?: string,
) {
  const followUp = await prisma.followUp.findFirst({
    where: {
      id: followUpId,
      OR: [
        { visit: { storeId } },
        { fieldSale: { storeId } },
      ],
      ...(staffId ? { assignedStaffId: staffId } : {}),
    },
  });

  if (!followUp) return null;

  return prisma.followUp.update({
    where: { id: followUpId },
    data: {
      status,
      outcomeDate: new Date(),
    },
  });
}
