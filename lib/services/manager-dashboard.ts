import { prisma } from "@/lib/db/prisma";
import { listStaff } from "@/lib/services/staff";
import { getStaffWorkQueueDigest } from "@/lib/services/staff-work-queue";
import { getPeriodRange } from "@/lib/utils/analytics";
import { startOfCalendarDay } from "@/lib/utils/calendar-date";
import type { AnalyticsPeriodLabel } from "@/types";

export interface ManagerAssignmentSummary {
  customersWithOpenWork: number;
  openFollowUps: number;
  mismatchedAssignments: number;
  activeStaff: number;
}

export interface ManagerStaffActivityRow {
  staffId: string;
  staffName: string;
  role: string;
  isActive: boolean;
  monthlyVisits: number;
  conversionRate: number;
  openFollowUps: number;
  pendingWork: number;
  overdueTasks: number;
  dueTodayTasks: number;
}

export interface ManagerDashboardOverview {
  assignment: ManagerAssignmentSummary;
  staffActivity: ManagerStaffActivityRow[];
}

export async function getManagerAssignmentSummary(
  storeId: string,
): Promise<ManagerAssignmentSummary> {
  const [openFollowUps, openFollowUpRows, activeStaff] = await Promise.all([
      prisma.followUp.count({
        where: {
          status: "OPEN",
          OR: [{ visit: { storeId } }, { fieldSale: { storeId } }],
        },
      }),
      prisma.followUp.findMany({
        where: {
          status: "OPEN",
          OR: [{ visit: { storeId } }, { fieldSale: { storeId } }],
        },
        select: {
          assignedStaffId: true,
          visit: { select: { staffId: true, customerId: true } },
          fieldSale: { select: { staffId: true, customerId: true } },
        },
      }),
      prisma.staff.count({
        where: { storeId, isActive: true, role: { in: ["STAFF", "STORE_MANAGER"] } },
      }),
    ]);

  const customerIds = new Set<string>();
  for (const row of openFollowUpRows) {
    const customerId = row.visit?.customerId ?? row.fieldSale?.customerId;
    if (customerId) customerIds.add(customerId);
  }

  const mismatchedAssignments = openFollowUpRows.filter((row) => {
    const ownerId = row.visit?.staffId ?? row.fieldSale?.staffId;
    return ownerId != null && ownerId !== row.assignedStaffId;
  }).length;

  return {
    customersWithOpenWork: customerIds.size,
    openFollowUps,
    mismatchedAssignments,
    activeStaff,
  };
}

export async function getManagerStaffActivity(
  storeId: string,
  period?: AnalyticsPeriodLabel,
): Promise<ManagerStaffActivityRow[]> {
  const staff = await listStaff(storeId);
  const activeMembers = staff.filter((member) => member.isActive);
  const periodMetrics =
    period != null ? await getStaffPeriodMetrics(storeId, period) : null;

  const rows = await Promise.all(
    activeMembers.map(async (member) => {
      const digest = await getStaffWorkQueueDigest({
        staffId: member.id,
        storeId,
        period,
      });

      const metrics = periodMetrics?.get(member.id);

      return {
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        isActive: member.isActive,
        monthlyVisits: metrics?.visits ?? member.monthlyVisits,
        conversionRate: metrics?.conversionRate ?? member.conversionRate,
        openFollowUps: metrics?.openFollowUps ?? member.openFollowUps,
        pendingWork: digest.total,
        overdueTasks: digest.overdue,
        dueTodayTasks: digest.dueToday,
      };
    }),
  );

  return rows.sort((a, b) => {
    if (b.pendingWork !== a.pendingWork) return b.pendingWork - a.pendingWork;
    if (b.overdueTasks !== a.overdueTasks) return b.overdueTasks - a.overdueTasks;
    return a.staffName.localeCompare(b.staffName);
  });
}

async function getStaffPeriodMetrics(
  storeId: string,
  period: AnalyticsPeriodLabel,
): Promise<
  Map<
    string,
    {
      visits: number;
      conversionRate: number;
      openFollowUps: number;
    }
  >
> {
  const { start, end } = getPeriodRange(period);
  const rangeStart = startOfCalendarDay(start);
  const rangeEnd = startOfCalendarDay(end);
  rangeEnd.setHours(23, 59, 59, 999);

  const staffIds = await prisma.staff
    .findMany({ where: { storeId }, select: { id: true } })
    .then((rows) => rows.map((row) => row.id));

  const [visitAggregates, openFollowUps] = await Promise.all([
    prisma.visit.groupBy({
      by: ["staffId", "purchaseStatus"],
      where: {
        storeId,
        visitDate: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      _count: { _all: true },
    }),
    staffIds.length === 0
      ? Promise.resolve([])
      : prisma.followUp.groupBy({
          by: ["assignedStaffId"],
          where: {
            assignedStaffId: { in: staffIds },
            status: "OPEN",
            followUpDate: {
              gte: rangeStart,
              lte: rangeEnd,
            },
          },
          _count: { _all: true },
        }),
  ]);

  const conversionByStaff = new Map<string, { purchased: number; total: number }>();
  for (const row of visitAggregates) {
    const conv = conversionByStaff.get(row.staffId) ?? { purchased: 0, total: 0 };
    conv.total += row._count._all;
    if (row.purchaseStatus === "PURCHASED") conv.purchased += row._count._all;
    conversionByStaff.set(row.staffId, conv);
  }

  const followUpCountByStaff = new Map(
    openFollowUps.map((row) => [row.assignedStaffId, row._count._all]),
  );

  const metrics = new Map<
    string,
    {
      visits: number;
      conversionRate: number;
      openFollowUps: number;
    }
  >();

  for (const staffId of staffIds) {
    const conv = conversionByStaff.get(staffId) ?? { purchased: 0, total: 0 };
    const conversionRate =
      conv.total > 0 ? Math.round((conv.purchased / conv.total) * 1000) / 10 : 0;

    metrics.set(staffId, {
      visits: conv.total,
      conversionRate,
      openFollowUps: followUpCountByStaff.get(staffId) ?? 0,
    });
  }

  return metrics;
}

export async function getManagerDashboardOverview(
  storeId: string,
): Promise<ManagerDashboardOverview> {
  const [assignment, staffActivity] = await Promise.all([
    getManagerAssignmentSummary(storeId),
    getManagerStaffActivity(storeId),
  ]);

  return { assignment, staffActivity };
}
