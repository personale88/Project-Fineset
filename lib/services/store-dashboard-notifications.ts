import { prisma } from "@/lib/db/prisma";
import {
  buildCallsPeriodRange,
  extractCallQueueSignals,
} from "@/lib/services/call-queue-utils";
import { listOwnedStoresForBusinessOwner } from "@/lib/services/manager-stores";
import {
  staffMissedTotal,
  type StaffMissedSummary,
} from "@/lib/services/store-dashboard-notifications.types";
import type { ManagerStoreOption } from "@/types";
import type { CallAnswerStatus } from "@prisma/client";

export type { StaffMissedSummary } from "@/lib/services/store-dashboard-notifications.types";
export { staffMissedTotal } from "@/lib/services/store-dashboard-notifications.types";

interface StaffMissedCounts {
  missedCalls: number;
  missedBirthdays: number;
  missedAnniversaries: number;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isOverdueFollowUp(followUpDate: Date): boolean {
  return followUpDate < startOfDay(new Date());
}

function isMissedOccasion(
  occasionDate: Date | null | undefined,
  referenceDate: Date,
  lastCallAnswered: CallAnswerStatus | null | undefined,
): boolean {
  if (!occasionDate) return false;

  const occasionMonth = occasionDate.getUTCMonth();
  const occasionDay = occasionDate.getUTCDate();
  if (occasionMonth !== referenceDate.getMonth()) return false;
  if (occasionDay >= referenceDate.getDate()) return false;

  return lastCallAnswered !== "ANSWERED";
}

function emptyCounts(): StaffMissedCounts {
  return {
    missedCalls: 0,
    missedBirthdays: 0,
    missedAnniversaries: 0,
  };
}

function ensureStaffCounts(
  map: Map<string, StaffMissedCounts>,
  staffId: string,
): StaffMissedCounts {
  const existing = map.get(staffId);
  if (existing) return existing;
  const created = emptyCounts();
  map.set(staffId, created);
  return created;
}

async function buildStaffMissedForStore(
  store: ManagerStoreOption,
  referenceDate = new Date(),
): Promise<StaffMissedSummary[]> {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth() + 1;
  const { start, end } = buildCallsPeriodRange(year, month);
  const periodWhere = { gte: start, lte: end };

  const [staffMembers, openFollowUps, callVisits, occasionVisits, occasionFieldSales] =
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
      prisma.visit.findMany({
        where: {
          storeId: store.id,
          visitDate: periodWhere,
          OR: [{ birthMonth: month }, { anniversaryMonth: month }],
        },
        select: {
          staffId: true,
          dateOfBirth: true,
          anniversary: true,
          birthMonth: true,
          anniversaryMonth: true,
          lastCallAnswered: true,
          customer: {
            select: {
              dateOfBirth: true,
              anniversary: true,
            },
          },
        },
      }),
      prisma.fieldSale.findMany({
        where: {
          storeId: store.id,
          activityDate: periodWhere,
          OR: [{ birthMonth: month }, { anniversaryMonth: month }],
        },
        select: {
          staffId: true,
          birthMonth: true,
          anniversaryMonth: true,
          lastCallAnswered: true,
          customer: {
            select: {
              dateOfBirth: true,
              anniversary: true,
            },
          },
        },
      }),
    ]);

  const staffNameById = new Map(staffMembers.map((member) => [member.id, member.name]));
  const countsByStaff = new Map<string, StaffMissedCounts>();

  for (const member of staffMembers) {
    ensureStaffCounts(countsByStaff, member.id);
  }

  for (const followUp of openFollowUps) {
    if (!isOverdueFollowUp(followUp.followUpDate)) continue;
    ensureStaffCounts(countsByStaff, followUp.assignedStaffId).missedCalls += 1;
  }

  for (const visit of callVisits) {
    const bucket = ensureStaffCounts(countsByStaff, visit.staffId);
    const signals = extractCallQueueSignals({
      staffId: visit.staffId,
      followUp: visit.followUp,
      lastCallAnswered: visit.lastCallAnswered,
    });

    if (signals.lastCallAnswered === "NOT_ANSWERED") {
      bucket.missedCalls += 1;
    }

    if (
      visit.followUp?.status === "OPEN" &&
      visit.followUp.assignedStaffId === visit.staffId
    ) {
      bucket.missedCalls += 1;
    }
  }

  const recordOccasion = (
    staffId: string,
    birthMonth: number | null,
    anniversaryMonth: number | null,
    dateOfBirth: Date | null | undefined,
    anniversary: Date | null | undefined,
    lastCallAnswered: CallAnswerStatus | null | undefined,
  ) => {
    const bucket = ensureStaffCounts(countsByStaff, staffId);

    if (
      birthMonth === month &&
      isMissedOccasion(dateOfBirth ?? null, referenceDate, lastCallAnswered)
    ) {
      bucket.missedBirthdays += 1;
    }

    if (
      anniversaryMonth === month &&
      isMissedOccasion(anniversary ?? null, referenceDate, lastCallAnswered)
    ) {
      bucket.missedAnniversaries += 1;
    }
  };

  for (const visit of occasionVisits) {
    recordOccasion(
      visit.staffId,
      visit.birthMonth,
      visit.anniversaryMonth,
      visit.dateOfBirth ?? visit.customer?.dateOfBirth,
      visit.anniversary ?? visit.customer?.anniversary,
      visit.lastCallAnswered,
    );
  }

  for (const fieldSale of occasionFieldSales) {
    recordOccasion(
      fieldSale.staffId,
      fieldSale.birthMonth,
      fieldSale.anniversaryMonth,
      fieldSale.customer?.dateOfBirth,
      fieldSale.customer?.anniversary,
      fieldSale.lastCallAnswered,
    );
  }

  return Array.from(countsByStaff.entries())
    .map(([staffId, counts]) => ({
      storeId: store.id,
      storeName: store.name,
      storeCity: store.city,
      storeState: store.state,
      staffId,
      staffName: staffNameById.get(staffId) ?? "Unknown staff",
      missedCalls: counts.missedCalls,
      missedBirthdays: counts.missedBirthdays,
      missedAnniversaries: counts.missedAnniversaries,
    }))
    .filter((entry) => staffMissedTotal(entry) > 0);
}

export async function getBusinessOwnerStoreNotifications(
  email: string,
  primaryStoreId: string,
): Promise<StaffMissedSummary[]> {
  const stores = await listOwnedStoresForBusinessOwner(email, primaryStoreId);
  const items = (
    await Promise.all(stores.map((store) => buildStaffMissedForStore(store)))
  ).flat();

  return items.sort((a, b) => {
    const totalDiff = staffMissedTotal(b) - staffMissedTotal(a);
    if (totalDiff !== 0) return totalDiff;
    return (
      a.storeName.localeCompare(b.storeName) || a.staffName.localeCompare(b.staffName)
    );
  });
}
