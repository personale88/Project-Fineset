import { ensureProductionCustomerSchema } from "@/lib/db/ensure-production-customer-schema";
import { prisma } from "@/lib/db/prisma";
import type { CreateVisitInput } from "@/lib/validations/visit.schema";
import type { VisitListItem } from "@/types";
import type { Prisma, SourceChannel, Visit } from "@prisma/client";
import { visitDenormFields } from "@/lib/services/call-record-denorm";
import { buildVisitSearchWhere } from "@/lib/services/customer-search";
import { callOnlyVisitShellExclusion } from "@/lib/services/visit-list-filters";
import {
  decryptCustomerFields,
  decryptVisitPii,
  prepareCustomerPii,
} from "@/lib/services/pii";
import { calculateDurationMins } from "@/lib/utils/formatters";
import { resolveSchemeEnrollmentFlags } from "@/lib/services/scheme-enrollment";
import { normalizeSchemesPitched } from "@/lib/validations/scheme.schema";
import { notifyPortalDataChangeNow } from "@/lib/sync/notify-change";
import {
  applyTimeToCalendarDay,
  endOfCalendarDay,
  isSameCalendarDay,
  resolveCalendarDayFromInstant,
  startOfCalendarDay,
} from "@/lib/utils/calendar-date";
import { normalizeStoredFollowUpDate } from "@/lib/utils/follow-up-datetime";

interface CreateVisitParams extends CreateVisitInput {
  storeId: string;
  staffId: string;
  skipPortalSync?: boolean;
}

export async function createVisit(params: CreateVisitParams): Promise<Visit> {
  await ensureProductionCustomerSchema();

  const normalizedParams = normalizeSchemesPitched(params);

  const {
    storeId,
    staffId,
    customerName,
    customerPhone,
    area,
    address,
    profession,
    gender,
    ageGroup,
    dateOfBirth,
    anniversary,
    followUpNeeded,
    followUpDate,
    purchaseStatus,
    enrollmentOutcome,
    visitDate: visitDateInput,
    ...visitData
  } = normalizedParams;

  if (!purchaseStatus) {
    throw new Error("Purchase status is required");
  }

  const schemeFlags = resolveSchemeEnrollmentFlags(enrollmentOutcome);
  const customerPii = prepareCustomerPii(customerName, customerPhone);

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.upsert({
      where: {
        phoneHash_storeId: {
          phoneHash: customerPii.phoneHash,
          storeId,
        },
      },
      create: {
        name: customerPii.name,
        phone: customerPii.phone,
        phoneHash: customerPii.phoneHash,
        nameSearch: customerPii.nameSearch,
        phoneLast4: customerPii.phoneLast4,
        area,
        address,
        profession,
        gender,
        ageGroup,
        dateOfBirth,
        anniversary,
        ghsEnrolled: schemeFlags.ghsPolicy,
        activeScheme: schemeFlags.activeScheme,
        storeId,
      },
      update: {
        name: customerPii.name,
        phone: customerPii.phone,
        nameSearch: customerPii.nameSearch,
        phoneLast4: customerPii.phoneLast4,
        area,
        address,
        profession,
        gender,
        ageGroup,
        dateOfBirth,
        anniversary,
        ...(schemeFlags.ghsPolicy ? { ghsEnrolled: true } : {}),
        ...(schemeFlags.activeScheme ? { activeScheme: schemeFlags.activeScheme } : {}),
      },
    });

    const visitDay = resolveCalendarDayFromInstant(visitDateInput ?? new Date());
    const now = new Date();
    const inTime = visitData.inTime
      ? applyTimeToCalendarDay(visitDay, visitData.inTime)
      : isSameCalendarDay(visitDay, now)
        ? now
        : undefined;
    const outTime =
      visitData.outTime && inTime
        ? applyTimeToCalendarDay(visitDay, visitData.outTime)
        : null;
    const durationMins =
      inTime && outTime !== null ? calculateDurationMins(inTime, outTime) : null;
    const visitDate = inTime ?? visitDay;
    const resolvedFollowUpDate =
      followUpNeeded && followUpDate
        ? normalizeStoredFollowUpDate(followUpDate)
        : null;

    const denorm = visitDenormFields({
      transactionAmount: visitData.transactionAmount ?? null,
      budgetStated: visitData.budgetStated ?? null,
      purchaseStatus,
      dateOfBirth: dateOfBirth ?? customer.dateOfBirth,
      anniversary: anniversary ?? customer.anniversary,
    });

    const visit = await tx.visit.create({
      data: {
        ...visitData,
        purchaseStatus,
        customerName: customerPii.name,
        customerPhone: customerPii.phone,
        customerPhoneHash: customerPii.phoneHash,
        customerNameSearch: customerPii.customerNameSearch,
        phoneLast4: customerPii.phoneLast4,
        area,
        address,
        profession,
        gender,
        ageGroup,
        dateOfBirth,
        anniversary,
        storeId,
        staffId,
        customerId: customer.id,
        visitDate,
        inTime,
        outTime,
        durationMins,
        followUpNeeded,
        followUpDate: resolvedFollowUpDate,
        enrollmentOutcome,
        schemeEnrolled: schemeFlags.schemeEnrolled,
        ghsPolicy: schemeFlags.ghsPolicy,
        ...denorm,
      },
    });

    if (followUpNeeded && resolvedFollowUpDate) {
      await tx.followUp.create({
        data: {
          visitId: visit.id,
          assignedStaffId: staffId,
          followUpDate: resolvedFollowUpDate,
          reason: visitData.reasonNoPurchase ?? "Follow-up requested",
          status: "OPEN",
        },
      });
    }

    return decryptVisitPii(visit);
  }).then((visit) => {
    if (!params.skipPortalSync) {
      notifyPortalDataChangeNow(storeId, ["visits", "customers", "followUps"]);
    }
    return visit;
  });
}

interface ListVisitsParams {
  storeId?: string;
  page: number;
  pageSize: number;
  search?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  followUpOnly?: boolean;
  staffId?: string;
  purchaseStatus?: "PURCHASED" | "NOT_PURCHASED";
  visitType?: "WALK_IN" | "APPOINTMENT";
  customerType?: "NEW" | "REPEAT" | "VIP";
  sourceChannel?: SourceChannel;
}

export async function listVisits(
  params: ListVisitsParams,
): Promise<{ data: VisitListItem[]; total: number }> {
  const where: Prisma.VisitWhereInput = {};

  if (params.storeId) {
    where.storeId = params.storeId;
  }

  if (params.startDate || params.endDate) {
    where.visitDate = {};
    if (params.startDate) {
      where.visitDate.gte = startOfCalendarDay(params.startDate);
    }
    if (params.endDate) {
      where.visitDate.lte = endOfCalendarDay(params.endDate);
    }
  }

  if (params.followUpOnly) {
    where.followUpNeeded = true;
  }

  if (params.staffId) {
    where.staffId = params.staffId;
  }

  if (params.purchaseStatus) {
    where.purchaseStatus = params.purchaseStatus;
  }

  if (params.visitType) {
    where.visitType = params.visitType;
  }

  if (params.customerType) {
    where.customerType = params.customerType;
  }

  if (params.sourceChannel) {
    where.sourceChannel = params.sourceChannel;
  } else {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      callOnlyVisitShellExclusion(),
    ];
  }

  const searchWhere = params.search
    ? buildVisitSearchWhere(params.search)
    : null;
  const visitWhere: Prisma.VisitWhereInput = searchWhere
    ? { AND: [where, searchWhere] }
    : where;

  const orderBy: Prisma.VisitOrderByWithRelationInput = {
    [params.sortBy]: params.sortOrder,
  };

  const [visits, total] = await Promise.all([
    prisma.visit.findMany({
      where: visitWhere,
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        staff: { select: { id: true, name: true } },
        customer: {
          select: {
            area: true,
            address: true,
            profession: true,
            gender: true,
            ageGroup: true,
            dateOfBirth: true,
            anniversary: true,
          },
        },
        followUp: { select: { status: true } },
      },
    }),
    prisma.visit.count({ where: visitWhere }),
  ]);

  const data: VisitListItem[] = visits.map((visit) => {
    const decrypted = decryptVisitPii(visit);
    return {
      id: visit.id,
      customerId: visit.customerId,
      visitDate: visit.visitDate.toISOString(),
      inTime: visit.inTime?.toISOString() ?? null,
      outTime: visit.outTime?.toISOString() ?? null,
      durationMins: visit.durationMins,
      staffId: visit.staff.id,
      staffName: visit.staff.name,
      customerName: decrypted.customerName,
      customerPhone: decrypted.customerPhone,
      customerType: visit.customerType,
      visitType: visit.visitType,
      sourceChannel: visit.sourceChannel,
      area: visit.area ?? visit.customer?.area ?? null,
      address: visit.address ?? visit.customer?.address ?? null,
      profession: visit.profession ?? visit.customer?.profession ?? null,
      gender: visit.gender ?? visit.customer?.gender ?? null,
      ageGroup: visit.ageGroup ?? visit.customer?.ageGroup ?? null,
      dateOfBirth:
        visit.dateOfBirth?.toISOString() ??
        visit.customer?.dateOfBirth?.toISOString() ??
        null,
      anniversary:
        visit.anniversary?.toISOString() ??
        visit.customer?.anniversary?.toISOString() ??
        null,
      purchaseStatus: visit.purchaseStatus,
      productsExplored: visit.productsExplored,
      productsPurchased: visit.productsPurchased,
      transactionAmount: visit.transactionAmount,
      intentTier: visit.intentTier,
      reasonNoPurchase: visit.reasonNoPurchase,
      competitorMention: visit.competitorMention,
      purchaseOccasion: visit.purchaseOccasion,
      metalKtPref: visit.metalKtPref,
      budgetStated: visit.budgetStated,
      schemeEnrolled: visit.schemeEnrolled,
      ghsPolicy: visit.ghsPolicy,
      followUpNeeded: visit.followUpNeeded,
      followUpDate: visit.followUpDate?.toISOString() ?? null,
      staffNotes: visit.staffNotes,
      followUpStatus: visit.followUp?.status ?? null,
    };
  });

  return { data, total };
}

export async function getVisitById(
  id: string,
  storeId?: string,
): Promise<
  | (Prisma.VisitGetPayload<{
      include: {
        staff: { select: { name: true; id: true } };
        followUp: true;
        customer: true;
      };
    }> & {
      customer: ReturnType<typeof decryptCustomerFields> | null;
    })
  | null
> {
  const visit = await prisma.visit.findFirst({
    where: {
      id,
      ...(storeId ? { storeId } : {}),
    },
    include: {
      staff: { select: { name: true, id: true } },
      followUp: true,
      customer: true,
    },
  });

  if (!visit) return null;

  const decryptedVisit = decryptVisitPii(visit);
  return {
    ...visit,
    ...decryptedVisit,
    customer: visit.customer
      ? decryptCustomerFields(visit.customer)
      : null,
  };
}
