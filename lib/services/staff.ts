import { prisma } from "@/lib/db/prisma";
import { logAuthEvent } from "@/lib/auth/audit";
import { inviteUser } from "@/lib/auth/invite-user";
import { deleteAllSessionsForUser } from "@/lib/auth/session-store";
import { notifyPortalDataChangeNow } from "@/lib/sync/notify-change";
import type { CreateStaffInput, UpdateStaffInput } from "@/lib/validations/staff.schema";
import type { Prisma, PurchaseStatus } from "@prisma/client";
import type { StaffPerformanceRow } from "@/types";
import {
  calculateAvgTransaction,
  calculateConversionRate,
  calculateTotalRevenue,
} from "@/lib/utils/analytics";

export class StaffDeleteError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "StaffDeleteError";
  }
}

export class StaffUpdateError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "StaffUpdateError";
  }
}

export async function listStaff(storeId: string) {
  const staffIds = await prisma.staff
    .findMany({ where: { storeId }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id));

  const [staff, visitAggregates, openFollowUps] = await Promise.all([
    prisma.staff.findMany({
      where: { storeId },
      orderBy: { name: "asc" },
      include: {
        appUser: {
          select: {
            email: true,
          },
        },
        _count: {
          select: {
            visits: true,
            fieldSales: true,
            assignedFollowUps: true,
          },
        },
      },
    }),
    prisma.visit.groupBy({
      by: ["staffId", "purchaseStatus"],
      where: { storeId },
      _count: { _all: true },
      _sum: { transactionAmount: true },
    }),
    staffIds.length === 0
      ? Promise.resolve([])
      : prisma.followUp.groupBy({
          by: ["assignedStaffId"],
          where: {
            assignedStaffId: { in: staffIds },
            status: "OPEN",
          },
          _count: { _all: true },
        }),
  ]);

  const revenueByStaff = new Map<string, number>();
  const conversionByStaff = new Map<string, { purchased: number; total: number }>();
  for (const row of visitAggregates) {
    revenueByStaff.set(
      row.staffId,
      (revenueByStaff.get(row.staffId) ?? 0) +
        (row.purchaseStatus === "PURCHASED" ? (row._sum.transactionAmount ?? 0) : 0),
    );
    const conv = conversionByStaff.get(row.staffId) ?? { purchased: 0, total: 0 };
    conv.total += row._count._all;
    if (row.purchaseStatus === "PURCHASED") conv.purchased += row._count._all;
    conversionByStaff.set(row.staffId, conv);
  }

  const followUpCountByStaff = new Map(
    openFollowUps.map((row) => [row.assignedStaffId, row._count._all]),
  );

  return staff.map((member) => {
    const visitCount = member._count.visits;
    const hasActivity =
      visitCount > 0 ||
      member._count.fieldSales > 0 ||
      member._count.assignedFollowUps > 0;
    const conv = conversionByStaff.get(member.id) ?? { purchased: 0, total: 0 };
    const conversionRate =
      conv.total > 0 ? Math.round((conv.purchased / conv.total) * 1000) / 10 : 0;

    return {
      id: member.id,
      name: member.name,
      employeeId: member.employeeId,
      phone: member.phone,
      role: member.role,
      email: member.appUser?.email ?? null,
      createdAt: member.createdAt,
      isActive: member.isActive,
      visitCount,
      canDelete: !hasActivity,
      monthlyRevenue: revenueByStaff.get(member.id) ?? 0,
      conversionRate,
      openFollowUps: followUpCountByStaff.get(member.id) ?? 0,
    };
  });
}

export async function createStaff(storeId: string, input: CreateStaffInput) {
  const result = await inviteUser({
    name: input.name,
    email: input.email,
    password: input.password,
    role: input.role,
    storeId,
    employeeId: input.employeeId,
    phone: input.phone,
  });

  void logAuthEvent({
    event: "STAFF_CREATED",
    email: input.email,
    metadata: { storeId, appUserId: result.appUserId, role: input.role },
  });

  notifyPortalDataChangeNow(storeId, ["staff"]);
  return result;
}

export async function updateStaff(
  staffId: string,
  storeId: string,
  input: UpdateStaffInput,
) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, storeId },
    include: {
      appUser: true,
      store: { select: { name: true } },
    },
  });

  if (!staff) {
    return { count: 0 };
  }

  if (input.employeeId && input.employeeId !== staff.employeeId) {
    const duplicateEmployee = await prisma.staff.findUnique({
      where: { employeeId: input.employeeId },
    });
    if (duplicateEmployee && duplicateEmployee.id !== staffId) {
      throw new StaffUpdateError("Employee ID already exists", 409);
    }
  }

  const normalizedEmail = input.email?.trim().toLowerCase();
  if (normalizedEmail && staff.appUser && normalizedEmail !== staff.appUser.email) {
    const duplicateEmail = await prisma.appUser.findUnique({
      where: { email: normalizedEmail },
    });
    if (duplicateEmail && duplicateEmail.id !== staff.appUser.id) {
      throw new StaffUpdateError("This email is already in use", 409);
    }
  }

  const staffData: Prisma.StaffUpdateInput = {};
  if (input.name !== undefined) {
    staffData.name = input.name.trim();
  }
  if (input.employeeId !== undefined) {
    staffData.employeeId = input.employeeId;
  }
  if (input.phone !== undefined) {
    staffData.phone = input.phone;
  }
  if (input.role !== undefined) {
    staffData.role = input.role;
  }
  if (input.isActive !== undefined) {
    staffData.isActive = input.isActive;
  }

  if (Object.keys(staffData).length > 0) {
    await prisma.staff.update({
      where: { id: staffId },
      data: staffData,
    });
  }

  const appUserNeedsUpdate =
    staff.appUser &&
    (input.name !== undefined ||
      normalizedEmail ||
      input.role !== undefined ||
      input.isActive !== undefined);

  if (appUserNeedsUpdate && staff.appUser) {
    const appUserData: Prisma.AppUserUpdateInput = {};
    if (input.name !== undefined) {
      appUserData.name = input.name.trim();
    }
    if (normalizedEmail) {
      appUserData.email = normalizedEmail;
    }
    if (input.role !== undefined) {
      appUserData.role = input.role;
    }
    if (input.isActive !== undefined) {
      appUserData.isActive = input.isActive;
    }
    await prisma.appUser.update({
      where: { id: staff.appUser.id },
      data: appUserData,
    });

    if (input.isActive === false) {
      await deleteAllSessionsForUser(staff.appUser.id);
      void logAuthEvent({
        event: "USER_DEACTIVATED",
        email: staff.appUser.email,
        metadata: { staffId, storeId },
      });
    } else if (input.isActive === true) {
      void logAuthEvent({
        event: "USER_ACTIVATED",
        email: staff.appUser.email,
        metadata: { staffId, storeId },
      });
    }
  }

  notifyPortalDataChangeNow(storeId, ["staff"]);
  return { count: 1 };
}

export async function deleteStaff(staffId: string, storeId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, storeId },
    include: {
      appUser: { select: { id: true, authId: true } },
      _count: {
        select: {
          visits: true,
          fieldSales: true,
          assignedFollowUps: true,
        },
      },
    },
  });

  if (!staff) {
    throw new StaffDeleteError("Staff member not found", 404);
  }

  const { visits, fieldSales, assignedFollowUps } = staff._count;
  if (visits > 0 || fieldSales > 0 || assignedFollowUps > 0) {
    throw new StaffDeleteError(
      "Cannot delete staff with existing visits, field sales, or follow-ups. Mark them inactive instead.",
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    if (staff.appUser) {
      await tx.userSession.deleteMany({ where: { appUserId: staff.appUser.id } });
      await tx.appUser.delete({ where: { id: staff.appUser.id } });
    }
    await tx.staff.delete({ where: { id: staffId } });
  });

  notifyPortalDataChangeNow(storeId, ["staff"]);
}

export async function getStaffPerformance(
  storeId?: string,
): Promise<StaffPerformanceRow[]> {
  const where: Prisma.StaffWhereInput = { isActive: true };
  if (storeId) where.storeId = storeId;

  const staff = await prisma.staff.findMany({
    where,
    include: {
      store: { select: { name: true } },
      visits: {
        select: {
          purchaseStatus: true,
          transactionAmount: true,
          followUpNeeded: true,
        },
      },
    },
  });

  return staff.map((member) => {
    const visits = member.visits;
    const followUpCount = visits.filter((v) => v.followUpNeeded).length;

    return {
      staffId: member.id,
      staffName: member.name,
      storeId: member.storeId,
      storeName: member.store.name,
      visits: visits.length,
      revenue: calculateTotalRevenue(visits),
      conversionRate: calculateConversionRate(visits),
      followUpRate:
        visits.length > 0
          ? Math.round((followUpCount / visits.length) * 1000) / 10
          : 0,
    };
  });
}

export async function getStaffById(staffId: string, storeId?: string) {
  return prisma.staff.findFirst({
    where: {
      id: staffId,
      ...(storeId ? { storeId } : {}),
    },
    include: {
      store: { select: { name: true } },
      visits: {
        orderBy: { visitDate: "desc" },
        take: 10,
      },
    },
  });
}

export function enrichStaffWithMetrics(
  visits: Array<{
    purchaseStatus: import("@prisma/client").PurchaseStatus;
    transactionAmount: number | null;
  }>,
) {
  return {
    revenue: calculateTotalRevenue(visits),
    conversionRate: calculateConversionRate(visits),
    avgTransaction: calculateAvgTransaction(visits),
  };
}
