import { prisma } from "@/lib/db/prisma";
import type { CreateFieldSaleInput } from "@/lib/validations/field-sale.schema";
import type { FieldSale, Prisma } from "@prisma/client";
import { Prisma as PrismaClient } from "@prisma/client";
import { resolveSchemeEnrollmentFlags } from "@/lib/services/scheme-enrollment";
import { normalizeSchemesPitched } from "@/lib/validations/scheme.schema";
import { broadcastSyncEvent } from "@/lib/sync/broadcaster";
import { buildFieldSaleSearchWhere } from "@/lib/services/customer-search";
import {
  decryptVisitPii,
  prepareCustomerPii,
} from "@/lib/services/pii";
import { fieldSaleDenormFields } from "@/lib/services/call-record-denorm";
import { resolveCalendarDayFromInstant } from "@/lib/utils/calendar-date";
import { calculateDurationMins, formatDate } from "@/lib/utils/formatters";

interface CreateFieldSaleParams extends CreateFieldSaleInput {
  storeId: string;
  staffId: string;
}

export async function createFieldSale(
  params: CreateFieldSaleParams,
): Promise<FieldSale> {
  const normalizedParams = normalizeSchemesPitched(params);

  const {
    storeId,
    staffId,
    customerName,
    customerPhone,
    area,
    gender,
    ageGroup,
    profession,
    activityDate,
    startTime,
    endTime,
    followUpNeeded,
    followUpDate,
    enrollmentOutcome: _enrollmentOutcome,
    ...fieldData
  } = normalizedParams;

  const enrollmentOutcome = normalizedParams.enrollmentOutcome ?? null;

  const customerPii = prepareCustomerPii(customerName, customerPhone);
  const enrollmentFlags = resolveSchemeEnrollmentFlags(enrollmentOutcome);
  const resolvedStart = startTime ?? new Date();
  const resolvedEnd = endTime ?? null;
  const durationMins =
    resolvedEnd !== null
      ? calculateDurationMins(resolvedStart, resolvedEnd)
      : null;

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
        gender,
        ageGroup,
        profession,
        ghsEnrolled: enrollmentFlags.ghsPolicy,
        activeScheme: enrollmentFlags.activeScheme,
        storeId,
      },
      update: {
        name: customerPii.name,
        phone: customerPii.phone,
        nameSearch: customerPii.nameSearch,
        phoneLast4: customerPii.phoneLast4,
        area,
        gender,
        ageGroup,
        profession,
        ...(enrollmentFlags.ghsPolicy ? { ghsEnrolled: true } : {}),
        ...(enrollmentFlags.activeScheme
          ? { activeScheme: enrollmentFlags.activeScheme }
          : {}),
      },
    });

    const denorm = fieldSaleDenormFields({
      monthlyCommitment: fieldData.monthlyCommitment ?? null,
      dateOfBirth: customer.dateOfBirth,
      anniversary: customer.anniversary,
    });

    const fieldSale = await tx.fieldSale.create({
      data: {
        ...fieldData,
        enrollmentOutcome: enrollmentOutcome ?? undefined,
        activityDate: activityDate
          ? resolveCalendarDayFromInstant(activityDate)
          : resolveCalendarDayFromInstant(new Date()),
        startTime: resolvedStart,
        endTime: resolvedEnd,
        durationMins,
        storeId,
        staffId,
        customerId: customer.id,
        customerName: customerPii.name,
        customerPhone: customerPii.phone,
        customerPhoneHash: customerPii.phoneHash,
        customerNameSearch: customerPii.customerNameSearch,
        phoneLast4: customerPii.phoneLast4,
        area,
        gender,
        ageGroup,
        profession,
        followUpNeeded,
        followUpDate: followUpNeeded ? followUpDate : null,
        ...denorm,
      },
    });

    if (followUpNeeded && followUpDate) {
      await tx.followUp.create({
        data: {
          fieldSaleId: fieldSale.id,
          assignedStaffId: staffId,
          followUpDate,
          reason: "Field activity follow-up",
          status: "OPEN",
        },
      });
    }

    return decryptFieldSalePii(fieldSale);
  }).then((fieldSale) => {
    broadcastSyncEvent(storeId, ["fieldSales", "customers", "followUps"]);
    return fieldSale;
  });
}

export function decryptFieldSalePii<T extends { customerName: string; customerPhone: string }>(
  record: T,
): T {
  return decryptVisitPii(record);
}

interface ListFieldSalesParams {
  storeId?: string;
  staffId?: string;
  page: number;
  pageSize: number;
  year: number;
  month: number;
  allTime?: boolean;
  search?: string;
  enrollmentOutcome?: CreateFieldSaleInput["enrollmentOutcome"];
  activityType?: CreateFieldSaleInput["activityType"];
}

function monthRange(year: number, month: number) {
  return {
    gte: new Date(year, month - 1, 1),
    lt: new Date(year, month, 1),
  };
}

type FieldSaleFilterParams = Pick<
  ListFieldSalesParams,
  "storeId" | "staffId" | "search" | "enrollmentOutcome" | "activityType"
>;

function applyFieldSaleFilters(
  where: Prisma.FieldSaleWhereInput,
  params: FieldSaleFilterParams,
): Prisma.FieldSaleWhereInput {
  if (params.storeId) where.storeId = params.storeId;
  if (params.staffId) where.staffId = params.staffId;
  if (params.enrollmentOutcome) where.enrollmentOutcome = params.enrollmentOutcome;
  if (params.activityType) where.activityType = params.activityType;

  const searchWhere = params.search?.trim()
    ? buildFieldSaleSearchWhere(params.search)
    : null;
  if (searchWhere) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      searchWhere,
    ];
  }

  return where;
}

function buildFieldSaleWhere(params: ListFieldSalesParams): Prisma.FieldSaleWhereInput {
  const dateFilter = params.allTime
    ? {}
    : { activityDate: monthRange(params.year, params.month) };
  return applyFieldSaleFilters(dateFilter, params);
}

function buildFieldSaleYearWhere(
  params: FieldSaleFilterParams & { year: number },
): Prisma.FieldSaleWhereInput {
  return applyFieldSaleFilters(
    {
      activityDate: {
        gte: new Date(params.year, 0, 1),
        lt: new Date(params.year + 1, 0, 1),
      },
    },
    params,
  );
}

function countFieldSaleMonthsFromDates(dates: Array<{ activityDate: Date }>) {
  const counts = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    count: 0,
  }));

  for (const { activityDate } of dates) {
    counts[activityDate.getMonth()].count += 1;
  }

  return counts;
}

export async function listFieldSales(params: ListFieldSalesParams) {
  const where = buildFieldSaleWhere(params);
  const yearWhere = buildFieldSaleYearWhere(params);

  const yearRecordsBaseParts: PrismaClient.Sql[] = [];
  if (params.storeId) yearRecordsBaseParts.push(PrismaClient.sql`"storeId" = ${params.storeId}`);
  if (params.staffId) yearRecordsBaseParts.push(PrismaClient.sql`"staffId" = ${params.staffId}`);
  const yearWhereClause =
    yearRecordsBaseParts.length > 0
      ? PrismaClient.sql`WHERE ${PrismaClient.join(yearRecordsBaseParts, " AND ")}`
      : PrismaClient.empty;

  const [records, total, yearActivityDates, yearRows] = await Promise.all([
    prisma.fieldSale.findMany({
      where,
      orderBy: { activityDate: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        staff: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    }),
    prisma.fieldSale.count({ where }),
    prisma.fieldSale.findMany({
      where: yearWhere,
      select: { activityDate: true },
    }),
    prisma.$queryRaw<Array<{ year: number }>>`
      SELECT DISTINCT EXTRACT(YEAR FROM "activityDate")::int AS year
      FROM "FieldSale"
      ${yearWhereClause}
      ORDER BY year DESC
      LIMIT 10
    `,
  ]);

  const months = countFieldSaleMonthsFromDates(yearActivityDates);

  const availableYears = Array.from(
    new Set([
      ...yearRows.map((r) => Number(r.year)),
      new Date().getFullYear(),
    ]),
  ).sort((a, b) => b - a);

  return {
    data: records.map((record) => {
      const decrypted = decryptFieldSalePii(record);
      return {
        id: record.id,
        activityDate: record.activityDate.toISOString(),
        activityDateLabel: formatDate(record.activityDate),
        staffId: record.staff.id,
        staffName: record.staff.name,
        storeId: record.store.id,
        storeName: record.store.name,
        customerName: decrypted.customerName,
        customerPhone: decrypted.customerPhone,
        customerType: record.customerType,
        activityType: record.activityType,
        locationLabel: record.locationLabel,
        schemesPitched: record.schemesPitched,
        enrollmentOutcome: record.enrollmentOutcome,
        monthlyCommitment: record.monthlyCommitment,
        intentTier: record.intentTier,
        reasonNoEnrollment: record.reasonNoEnrollment,
        followUpNeeded: record.followUpNeeded,
        followUpDate: record.followUpDate?.toISOString() ?? null,
        staffNotes: record.staffNotes,
      };
    }),
    total,
    page: params.page,
    pageSize: params.pageSize,
    year: params.year,
    month: params.month,
    filters: {
      months,
      availableYears,
    },
  };
}
