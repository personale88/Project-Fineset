import { prisma } from "@/lib/db/prisma";
import { listStaff } from "@/lib/services/staff";
import { getStaffWorkQueueDigest } from "@/lib/services/staff-work-queue";

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
): Promise<ManagerStaffActivityRow[]> {
  const staff = await listStaff(storeId);
  const activeMembers = staff.filter((member) => member.isActive);

  const rows = await Promise.all(
    activeMembers.map(async (member) => {
      const digest = await getStaffWorkQueueDigest({
        staffId: member.id,
        storeId,
      });

      return {
        staffId: member.id,
        staffName: member.name,
        role: member.role,
        isActive: member.isActive,
        monthlyVisits: member.monthlyVisits,
        conversionRate: member.conversionRate,
        openFollowUps: member.openFollowUps,
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

export async function getManagerDashboardOverview(
  storeId: string,
): Promise<ManagerDashboardOverview> {
  const [assignment, staffActivity] = await Promise.all([
    getManagerAssignmentSummary(storeId),
    getManagerStaffActivity(storeId),
  ]);

  return { assignment, staffActivity };
}
