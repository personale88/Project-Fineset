import { prisma } from "@/lib/db/prisma";
import { decryptVisitPii } from "@/lib/services/pii";
import { notifyPortalDataChangeNow } from "@/lib/sync/notify-change";
import { startOfCalendarDay, formatCalendarDate } from "@/lib/utils/calendar-date";
import type { UpdateFollowUpInput } from "@/lib/validations/follow-ups.schema";
import type { FollowUpListItem } from "@/types";
import type { FollowUpStatus, Prisma } from "@prisma/client";

function startOfDay(date: Date): Date {
  return startOfCalendarDay(date);
}

function endOfDay(date: Date): Date {
  const next = startOfCalendarDay(date);
  next.setDate(next.getDate() + 1);
  next.setMilliseconds(next.getMilliseconds() - 1);
  return next;
}

interface ListFollowUpsParams {
  storeId: string;
  staffId?: string;
  status?: FollowUpStatus;
  overdue?: boolean;
  dueToday?: boolean;
  filter?: "overdue" | "due_today" | "open";
  mismatched?: boolean;
}

interface UpdateFollowUpParams {
  followUpId: string;
  storeId: string;
  staffId?: string;
  input: UpdateFollowUpInput;
}

const followUpInclude = {
  visit: {
    select: {
      storeId: true,
      staffId: true,
      customerName: true,
      customerPhone: true,
    },
  },
  fieldSale: {
    select: {
      storeId: true,
      staffId: true,
      customerName: true,
      customerPhone: true,
    },
  },
  assignedStaff: {
    select: { name: true },
  },
} satisfies Prisma.FollowUpInclude;

type FollowUpWithSource = Prisma.FollowUpGetPayload<{
  include: typeof followUpInclude;
}>;

function resolveStoreId(followUp: FollowUpWithSource): string | null {
  return followUp.visit?.storeId ?? followUp.fieldSale?.storeId ?? null;
}

async function mapFollowUpToListItem(
  followUp: FollowUpWithSource,
): Promise<FollowUpListItem> {
  const source = followUp.visit ?? followUp.fieldSale;
  const decrypted = source
    ? decryptVisitPii({
        customerName: source.customerName,
        customerPhone: source.customerPhone,
      })
    : { customerName: "Unknown", customerPhone: "" };

  return {
    id: followUp.id,
    visitId: followUp.visitId,
    fieldSaleId: followUp.fieldSaleId,
    assignedStaffId: followUp.assignedStaffId,
    customerName: decrypted.customerName,
    customerPhone: decrypted.customerPhone,
    assignedStaffName: followUp.assignedStaff.name,
    followUpDate: formatCalendarDate(followUp.followUpDate),
    reason: followUp.reason,
    callOutcome: followUp.callOutcome,
    status: followUp.status,
  };
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

  const resolvedFilter =
    params.filter ??
    (params.dueToday ? "due_today" : params.overdue ? "overdue" : undefined);

  if (resolvedFilter === "overdue") {
    where.followUpDate = { lt: startOfDay(new Date()) };
    if (!params.status) {
      where.status = "OPEN";
    }
  } else if (resolvedFilter === "due_today") {
    const todayStart = startOfDay(new Date());
    where.followUpDate = { gte: todayStart, lte: endOfDay(new Date()) };
    where.status = "OPEN";
  } else if (resolvedFilter === "open") {
    where.status = "OPEN";
  } else if (params.overdue) {
    where.followUpDate = { lt: startOfDay(new Date()) };
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
          storeId: true,
          staffId: true,
          customerName: true,
          customerPhone: true,
        },
      },
      fieldSale: {
        select: {
          storeId: true,
          staffId: true,
          customerName: true,
          customerPhone: true,
        },
      },
    },
  });

  const filteredFollowUps = params.mismatched
    ? followUps.filter((followUp) => {
        const ownerId = followUp.visit?.staffId ?? followUp.fieldSale?.staffId;
        return ownerId != null && ownerId !== followUp.assignedStaffId;
      })
    : followUps;

  const staffIds = Array.from(new Set(filteredFollowUps.map((f) => f.assignedStaffId)));
  const staffMembers = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true },
  });
  const staffMap = new Map(staffMembers.map((s) => [s.id, s.name]));

  return filteredFollowUps.map((f) => {
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
      fieldSaleId: f.fieldSaleId,
      assignedStaffId: f.assignedStaffId,
      customerName: decrypted.customerName,
      customerPhone: decrypted.customerPhone,
      assignedStaffName: staffMap.get(f.assignedStaffId) ?? "Unknown",
      followUpDate: formatCalendarDate(f.followUpDate),
      reason: f.reason,
      callOutcome: f.callOutcome,
      status: f.status,
    };
  });
}

function buildFollowUpUpdate(input: UpdateFollowUpInput): Prisma.FollowUpUpdateInput {
  const now = new Date();

  switch (input.action) {
    case "open":
      return {
        status: "OPEN",
        outcomeDate: null,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      };
    case "close":
      return {
        status: "CLOSED",
        outcomeDate: now,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      };
    case "schedule": {
      const followUpDate = startOfCalendarDay(input.followUpDate!);
      return {
        status: "OPEN",
        followUpDate,
        outcomeDate: null,
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      };
    }
  }
}

function buildParentSyncData(
  input: UpdateFollowUpInput,
  followUpDate: Date,
): { followUpNeeded: boolean; followUpDate: Date | null } {
  switch (input.action) {
    case "open":
      return { followUpNeeded: true, followUpDate };
    case "close":
      return { followUpNeeded: false, followUpDate: null };
    case "schedule":
      return {
        followUpNeeded: true,
        followUpDate: startOfCalendarDay(input.followUpDate!),
      };
  }
}

export async function updateFollowUp(
  params: UpdateFollowUpParams,
): Promise<FollowUpListItem | null> {
  const followUp = await prisma.followUp.findFirst({
    where: {
      id: params.followUpId,
      OR: [
        { visit: { storeId: params.storeId } },
        { fieldSale: { storeId: params.storeId } },
      ],
      ...(params.staffId ? { assignedStaffId: params.staffId } : {}),
    },
    include: followUpInclude,
  });

  if (!followUp) return null;

  const storeId = resolveStoreId(followUp);
  if (!storeId || storeId !== params.storeId) return null;

  const followUpUpdate = buildFollowUpUpdate(params.input);
  const scheduledDate =
    params.input.action === "schedule"
      ? startOfCalendarDay(params.input.followUpDate!)
      : followUp.followUpDate;
  const parentSync = buildParentSyncData(params.input, scheduledDate);

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.followUp.update({
      where: { id: params.followUpId },
      data: followUpUpdate,
      include: followUpInclude,
    });

    if (followUp.visitId) {
      await tx.visit.update({
        where: { id: followUp.visitId },
        data: parentSync,
      });
    }

    if (followUp.fieldSaleId) {
      await tx.fieldSale.update({
        where: { id: followUp.fieldSaleId },
        data: parentSync,
      });
    }

    return record;
  });

  notifyPortalDataChangeNow(params.storeId, ["followUps", "visits", "fieldSales", "callLogs"]);

  return mapFollowUpToListItem(updated);
}
