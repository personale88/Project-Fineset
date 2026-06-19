import { prisma } from "@/lib/db/prisma";
import {
  extractCallQueueSignals,
} from "@/lib/services/call-queue-utils";
import { classifyVisitMasterSource } from "@/lib/services/staff-call-master";
import { listOwnedStoresForBusinessOwner } from "@/lib/services/manager-stores";
import { decryptVisitPii } from "@/lib/services/pii";
import { getPeriodRange } from "@/lib/utils/analytics";
import type {
  OverdueAlertItem,
} from "@/lib/services/store-dashboard-notifications.types";
import type { AnalyticsPeriod, ManagerStoreOption } from "@/types";
import type { CallAnswerStatus } from "@prisma/client";

export type {
  OverdueAlertItem,
  OverdueAlertCategory,
  StaffMissedSummary,
} from "@/lib/services/store-dashboard-notifications.types";
export { staffMissedTotal } from "@/lib/services/store-dashboard-notifications.types";

interface AlertPeriodRange {
  start: Date;
  end: Date;
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isDateInRange(date: Date | string, range: AlertPeriodRange): boolean {
  const value = new Date(date);
  return value >= startOfDay(range.start) && value <= range.end;
}

function monthsInRange(range: AlertPeriodRange): number[] {
  const months = new Set<number>();
  const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const endMonth = new Date(range.end.getFullYear(), range.end.getMonth(), 1);

  while (cursor <= endMonth) {
    months.add(cursor.getMonth() + 1);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return [...months];
}

function missedOccasionDateInRange(
  occasionDate: Date,
  range: AlertPeriodRange,
  lastCallAnswered: CallAnswerStatus | null | undefined,
): Date | null {
  if (lastCallAnswered === "ANSWERED") return null;

  const years = new Set([range.start.getFullYear(), range.end.getFullYear()]);

  for (const year of years) {
    const occurrence = new Date(
      year,
      occasionDate.getUTCMonth(),
      occasionDate.getUTCDate(),
      12,
      0,
      0,
      0,
    );

    if (!isDateInRange(occurrence, range)) continue;
    if (occurrence > range.end) continue;

    return occurrence;
  }

  return null;
}

function followUpDueInRange(followUpDate: Date, range: AlertPeriodRange): boolean {
  return isDateInRange(followUpDate, range);
}

function isOverdueAsOfPeriodEnd(followUpDate: Date, range: AlertPeriodRange): boolean {
  const todayStart = startOfDay(new Date());
  const asOf = range.end < todayStart ? range.end : new Date();
  return followUpDate < startOfDay(asOf);
}

function pushAlert(
  items: OverdueAlertItem[],
  alert: Omit<OverdueAlertItem, "id">,
): void {
  items.push({
    ...alert,
    id: `${alert.category}:${alert.reason}:${alert.storeId}:${alert.staffId}:${alert.recordId ?? alert.customerName}:${alert.missedDate}`,
  });
}

async function buildOverdueAlertsForStore(
  store: ManagerStoreOption,
  range: AlertPeriodRange,
): Promise<OverdueAlertItem[]> {
  const periodWhere = { gte: range.start, lte: range.end };
  const occasionMonths = monthsInRange(range);
  const items: OverdueAlertItem[] = [];

  const [staffMembers, openFollowUps, callVisits, occasionVisits, occasionFieldSales] =
    await Promise.all([
      prisma.staff.findMany({
        where: { storeId: store.id, isActive: true },
        select: { id: true, name: true },
      }),
      prisma.followUp.findMany({
        where: {
          status: "OPEN",
          OR: [{ visit: { storeId: store.id } }, { fieldSale: { storeId: store.id } }],
        },
        select: {
          id: true,
          assignedStaffId: true,
          followUpDate: true,
          visit: {
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              sourceChannel: true,
            },
          },
          fieldSale: {
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
            },
          },
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
          id: true,
          staffId: true,
          customerName: true,
          customerPhone: true,
          sourceChannel: true,
          visitDate: true,
          lastCallAt: true,
          lastCallAnswered: true,
          followUp: {
            select: {
              id: true,
              status: true,
              assignedStaffId: true,
              followUpDate: true,
            },
          },
        },
      }),
      prisma.visit.findMany({
        where: {
          storeId: store.id,
          OR: [
            { visitDate: periodWhere },
            { birthMonth: { in: occasionMonths } },
            { anniversaryMonth: { in: occasionMonths } },
          ],
          AND: {
            OR: [{ birthMonth: { not: null } }, { anniversaryMonth: { not: null } }],
          },
        },
        select: {
          id: true,
          staffId: true,
          customerName: true,
          customerPhone: true,
          sourceChannel: true,
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
          OR: [
            { activityDate: periodWhere },
            { birthMonth: { in: occasionMonths } },
            { anniversaryMonth: { in: occasionMonths } },
          ],
          AND: {
            OR: [{ birthMonth: { not: null } }, { anniversaryMonth: { not: null } }],
          },
        },
        select: {
          id: true,
          staffId: true,
          customerName: true,
          customerPhone: true,
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

  const storeMeta = {
    storeId: store.id,
    storeName: store.name,
    storeCity: store.city,
    storeState: store.state,
  };

  const staffName = (staffId: string) => staffNameById.get(staffId) ?? "Unknown staff";
  const emittedFollowUpIds = new Set<string>();

  for (const followUp of openFollowUps) {
    if (!followUpDueInRange(followUp.followUpDate, range)) continue;
    if (!isOverdueAsOfPeriodEnd(followUp.followUpDate, range)) continue;

    const source = followUp.visit ?? followUp.fieldSale;
    if (!source) continue;

    emittedFollowUpIds.add(followUp.id);
    const decrypted = decryptVisitPii(source);
    pushAlert(items, {
      category: "calls",
      reason: "FOLLOW_UP_OVERDUE",
      ...storeMeta,
      staffId: followUp.assignedStaffId,
      staffName: staffName(followUp.assignedStaffId),
      customerName: decrypted.customerName,
      customerPhone: decrypted.customerPhone,
      missedDate: followUp.followUpDate.toISOString(),
      recordId: followUp.visit?.id ?? followUp.fieldSale?.id ?? null,
      masterSource: followUp.visit
        ? classifyVisitMasterSource(followUp.visit.sourceChannel)
        : "FIELD_SALE",
    });
  }

  for (const visit of callVisits) {
    const decrypted = decryptVisitPii(visit);
    const masterSource = classifyVisitMasterSource(visit.sourceChannel);
    const signals = extractCallQueueSignals({
      staffId: visit.staffId,
      followUp: visit.followUp,
      lastCallAnswered: visit.lastCallAnswered,
    });

    if (signals.lastCallAnswered === "NOT_ANSWERED") {
      const missedDate = visit.lastCallAt ?? visit.visitDate;
      if (!isDateInRange(missedDate, range)) continue;

      pushAlert(items, {
        category: "calls",
        reason: "NOT_ANSWERED",
        ...storeMeta,
        staffId: visit.staffId,
        staffName: staffName(visit.staffId),
        customerName: decrypted.customerName,
        customerPhone: decrypted.customerPhone,
        missedDate: missedDate.toISOString(),
        recordId: visit.id,
        masterSource,
      });
    }

    if (
      visit.followUp?.status === "OPEN" &&
      visit.followUp.assignedStaffId === visit.staffId &&
      !emittedFollowUpIds.has(visit.followUp.id) &&
      followUpDueInRange(visit.followUp.followUpDate, range) &&
      !isOverdueAsOfPeriodEnd(visit.followUp.followUpDate, range)
    ) {
      pushAlert(items, {
        category: "calls",
        reason: "OPEN_FOLLOW_UP",
        ...storeMeta,
        staffId: visit.staffId,
        staffName: staffName(visit.staffId),
        customerName: decrypted.customerName,
        customerPhone: decrypted.customerPhone,
        missedDate: visit.followUp.followUpDate.toISOString(),
        recordId: visit.id,
        masterSource,
      });
    }
  }

  const recordOccasion = (
    staffId: string,
    recordId: string,
    customerName: string,
    customerPhone: string,
    masterSource: OverdueAlertItem["masterSource"],
    birthMonth: number | null,
    anniversaryMonth: number | null,
    dateOfBirth: Date | null | undefined,
    anniversary: Date | null | undefined,
    lastCallAnswered: CallAnswerStatus | null | undefined,
  ) => {
    const decrypted = decryptVisitPii({ customerName, customerPhone });

    const birthdayDate = dateOfBirth
      ? missedOccasionDateInRange(dateOfBirth, range, lastCallAnswered)
      : null;
    if (birthMonth && birthdayDate) {
      pushAlert(items, {
        category: "birthdays",
        reason: "BIRTHDAY",
        ...storeMeta,
        staffId,
        staffName: staffName(staffId),
        customerName: decrypted.customerName,
        customerPhone: decrypted.customerPhone,
        missedDate: birthdayDate.toISOString(),
        recordId,
        masterSource,
      });
    }

    const anniversaryDate = anniversary
      ? missedOccasionDateInRange(anniversary, range, lastCallAnswered)
      : null;
    if (anniversaryMonth && anniversaryDate) {
      pushAlert(items, {
        category: "anniversaries",
        reason: "ANNIVERSARY",
        ...storeMeta,
        staffId,
        staffName: staffName(staffId),
        customerName: decrypted.customerName,
        customerPhone: decrypted.customerPhone,
        missedDate: anniversaryDate.toISOString(),
        recordId,
        masterSource,
      });
    }
  };

  for (const visit of occasionVisits) {
    recordOccasion(
      visit.staffId,
      visit.id,
      visit.customerName,
      visit.customerPhone,
      classifyVisitMasterSource(visit.sourceChannel),
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
      fieldSale.id,
      fieldSale.customerName,
      fieldSale.customerPhone,
      "FIELD_SALE",
      fieldSale.birthMonth,
      fieldSale.anniversaryMonth,
      fieldSale.customer?.dateOfBirth,
      fieldSale.customer?.anniversary,
      fieldSale.lastCallAnswered,
    );
  }

  return items.filter((item) => isDateInRange(item.missedDate, range));
}

export async function getBusinessOwnerStoreNotifications(
  email: string,
  primaryStoreId: string,
  period: AnalyticsPeriod["label"] = "today",
  referenceDate = new Date(),
): Promise<OverdueAlertItem[]> {
  const range = getPeriodRange(period, referenceDate);
  const stores = await listOwnedStoresForBusinessOwner(email, primaryStoreId);
  const items = (
    await Promise.all(stores.map((store) => buildOverdueAlertsForStore(store, range)))
  ).flat();

  return items.sort((a, b) => {
    const dateDiff = new Date(a.missedDate).getTime() - new Date(b.missedDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    return (
      a.customerName.localeCompare(b.customerName) ||
      a.storeName.localeCompare(b.storeName)
    );
  });
}
