import { prisma } from "@/lib/db/prisma";
import {
  buildCallsPeriodRange,
  extractCallQueueSignals,
} from "@/lib/services/call-queue-utils";
import { listOwnedStoresForBusinessOwner } from "@/lib/services/manager-stores";
import type {
  StoreNotificationStaffSummary,
  StoreNotificationSummary,
  StoreNotificationTotals,
} from "@/lib/services/store-dashboard-notifications.types";
import type { ManagerStoreOption } from "@/types";

export type {
  StoreNotificationStaffSummary,
  StoreNotificationSummary,
  StoreNotificationTotals,
} from "@/lib/services/store-dashboard-notifications.types";
export { storeNotificationCount } from "@/lib/services/store-dashboard-notifications.types";

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isOverdueFollowUp(followUpDate: Date): boolean {
  return followUpDate < startOfDay(new Date());
}

function isDueTodayFollowUp(followUpDate: Date): boolean {
  const today = new Date();
  return (
    followUpDate.getFullYear() === today.getFullYear() &&
    followUpDate.getMonth() === today.getMonth() &&
    followUpDate.getDate() === today.getDate()
  );
}

function emptyStaffSummary(
  staffId: string,
  staffName: string,
): StoreNotificationStaffSummary {
  return {
    staffId,
    staffName,
    overdueFollowUps: 0,
    dueTodayFollowUps: 0,
    followUpCalls: 0,
    notAnsweredCalls: 0,
  };
}

function ensureStaffBucket(
  map: Map<string, StoreNotificationStaffSummary>,
  staffId: string,
  staffName: string,
): StoreNotificationStaffSummary {
  const existing = map.get(staffId);
  if (existing) return existing;
  const created = emptyStaffSummary(staffId, staffName);
  map.set(staffId, created);
  return created;
}

async function buildStoreNotificationSummary(
  store: ManagerStoreOption,
  referenceDate = new Date(),
): Promise<StoreNotificationSummary> {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const { start, end } = buildCallsPeriodRange(year, month);
  const periodWhere = {
    gte: start,
    lte: end,
  };

  const [staffMembers, openFollowUps, callVisits, visitBirthdays, visitAnniversaries, fieldBirthdays, fieldAnniversaries] =
    await Promise.all([
      prisma.staff.findMany({
        where: { storeId: store.id, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.followUp.findMany({
        where: {
          status: "OPEN",
          OR: [{ visit: { storeId: store.id } }, { fieldSale: { storeId: store.id } }],
        },
        select: {
          assignedStaffId: true,
          followUpDate: true,
        },
      }),
      prisma.visit.findMany({
        where: {
          storeId: store.id,
          visitDate: periodWhere,
          OR: [
            { lastCallAnswered: "NOT_ANSWERED" },
            { followUp: { is: { status: "OPEN" } } },
          ],
        },
        select: {
          staffId: true,
          lastCallAnswered: true,
          followUp: {
            select: {
              status: true,
              assignedStaffId: true,
            },
          },
        },
      }),
      prisma.visit.count({
        where: { storeId: store.id, visitDate: periodWhere, birthMonth: month },
      }),
      prisma.visit.count({
        where: {
          storeId: store.id,
          visitDate: periodWhere,
          anniversaryMonth: month,
        },
      }),
      prisma.fieldSale.count({
        where: { storeId: store.id, activityDate: periodWhere, birthMonth: month },
      }),
      prisma.fieldSale.count({
        where: {
          storeId: store.id,
          activityDate: periodWhere,
          anniversaryMonth: month,
        },
      }),
    ]);

  const staffNameById = new Map(staffMembers.map((member) => [member.id, member.name]));
  const staffBuckets = new Map<string, StoreNotificationStaffSummary>();

  for (const member of staffMembers) {
    ensureStaffBucket(staffBuckets, member.id, member.name);
  }

  const totals: StoreNotificationTotals = {
    overdueFollowUps: 0,
    dueTodayFollowUps: 0,
    followUpCalls: 0,
    notAnsweredCalls: 0,
    birthdays: visitBirthdays + fieldBirthdays,
    anniversaries: visitAnniversaries + fieldAnniversaries,
  };

  for (const followUp of openFollowUps) {
    const staffName = staffNameById.get(followUp.assignedStaffId) ?? "Unknown staff";
    const bucket = ensureStaffBucket(
      staffBuckets,
      followUp.assignedStaffId,
      staffName,
    );

    if (isOverdueFollowUp(followUp.followUpDate)) {
      totals.overdueFollowUps += 1;
      bucket.overdueFollowUps += 1;
    } else if (isDueTodayFollowUp(followUp.followUpDate)) {
      totals.dueTodayFollowUps += 1;
      bucket.dueTodayFollowUps += 1;
    }
  }

  for (const visit of callVisits) {
    const staffName = staffNameById.get(visit.staffId) ?? "Unknown staff";
    const bucket = ensureStaffBucket(staffBuckets, visit.staffId, staffName);
    const signals = extractCallQueueSignals({
      staffId: visit.staffId,
      followUp: visit.followUp,
      lastCallAnswered: visit.lastCallAnswered,
    });

    if (signals.lastCallAnswered === "NOT_ANSWERED") {
      totals.notAnsweredCalls += 1;
      bucket.notAnsweredCalls += 1;
    }

    if (
      visit.followUp?.status === "OPEN" &&
      visit.followUp.assignedStaffId === visit.staffId
    ) {
      totals.followUpCalls += 1;
      bucket.followUpCalls += 1;
    }
  }

  const staff = Array.from(staffBuckets.values())
    .filter(
      (member) =>
        member.overdueFollowUps > 0 ||
        member.dueTodayFollowUps > 0 ||
        member.followUpCalls > 0 ||
        member.notAnsweredCalls > 0,
    )
    .sort((a, b) => {
      const aScore =
        a.overdueFollowUps * 4 +
        a.notAnsweredCalls * 3 +
        a.followUpCalls * 2 +
        a.dueTodayFollowUps;
      const bScore =
        b.overdueFollowUps * 4 +
        b.notAnsweredCalls * 3 +
        b.followUpCalls * 2 +
        b.dueTodayFollowUps;
      return bScore - aScore || a.staffName.localeCompare(b.staffName);
    });

  return {
    storeId: store.id,
    storeName: store.name,
    city: store.city,
    state: store.state,
    totals,
    staff,
  };
}

function hasStoreNotifications(summary: StoreNotificationSummary): boolean {
  const { totals } = summary;
  return (
    totals.overdueFollowUps > 0 ||
    totals.dueTodayFollowUps > 0 ||
    totals.followUpCalls > 0 ||
    totals.notAnsweredCalls > 0 ||
    totals.birthdays > 0 ||
    totals.anniversaries > 0
  );
}

export async function getBusinessOwnerStoreNotifications(
  email: string,
  primaryStoreId: string,
): Promise<StoreNotificationSummary[]> {
  const stores = await listOwnedStoresForBusinessOwner(email, primaryStoreId);
  const summaries = await Promise.all(
    stores.map((store) => buildStoreNotificationSummary(store)),
  );

  return summaries.sort((a, b) => {
    const aHas = hasStoreNotifications(a);
    const bHas = hasStoreNotifications(b);
    if (aHas !== bHas) return aHas ? -1 : 1;
    return a.storeName.localeCompare(b.storeName);
  });
}
