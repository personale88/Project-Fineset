import { prisma } from "@/lib/db/prisma";
import { EXTERNAL_SOURCE_CHANNELS } from "@/lib/services/staff-call-master";
import { buildCallsPeriodRange } from "@/lib/services/call-queue-utils";
import {
  buildFieldSaleListWhere,
  buildVisitListWhere,
  shouldQueryFieldSales,
  shouldQueryVisits,
  type StaffCallsDbQueryParams,
} from "@/lib/services/staff-calls-query";
import type { StaffCallMasterFilter } from "@/types";
import { Prisma } from "@prisma/client";

export type StaffCallPageSource = "VISIT" | "FIELD_SALE";

export interface StaffCallPageRef {
  id: string;
  source: StaffCallPageSource;
  activityAt: Date;
}

function visitSourceSql(master: StaffCallMasterFilter): Prisma.Sql {
  if (master === "STORE_VISIT") {
    return Prisma.sql`v."sourceChannel" = 'ORGANIC_WALK_IN'::"SourceChannel"`;
  }
  if (master === "EXTERNAL") {
    return Prisma.sql`v."sourceChannel" IN (${Prisma.join(
      EXTERNAL_SOURCE_CHANNELS.map((channel) => Prisma.sql`${channel}::"SourceChannel"`),
    )})`;
  }
  return Prisma.sql`TRUE`;
}

function visitQueueSql(
  queue: StaffCallsDbQueryParams["queue"],
  staffId: string,
  storeScope = false,
): Prisma.Sql {
  if (queue === "ALL") return Prisma.sql`TRUE`;
  if (queue === "NOT_ANSWERED") {
    return Prisma.sql`v."lastCallAnswered" = 'NOT_ANSWERED'::"CallAnswerStatus"`;
  }
  if (queue === "FOLLOW_UP") {
    return storeScope
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "FollowUp" f
          WHERE f."visitId" = v.id
            AND f.status = 'OPEN'::"FollowUpStatus"
        )`
      : Prisma.sql`EXISTS (
          SELECT 1 FROM "FollowUp" f
          WHERE f."visitId" = v.id
            AND f.status = 'OPEN'::"FollowUpStatus"
            AND f."assignedStaffId" = ${staffId}
        )`;
  }
  return storeScope
    ? Prisma.sql`(
    NOT EXISTS (
      SELECT 1 FROM "FollowUp" f
      WHERE f."visitId" = v.id
        AND f.status = 'OPEN'::"FollowUpStatus"
    )
    AND (v."lastCallAnswered" IS NULL OR v."lastCallAnswered" <> 'NOT_ANSWERED'::"CallAnswerStatus")
  )`
    : Prisma.sql`(
    NOT EXISTS (
      SELECT 1 FROM "FollowUp" f
      WHERE f."visitId" = v.id
        AND f.status = 'OPEN'::"FollowUpStatus"
        AND f."assignedStaffId" = ${staffId}
    )
    AND (v."lastCallAnswered" IS NULL OR v."lastCallAnswered" <> 'NOT_ANSWERED'::"CallAnswerStatus")
  )`;
}

function fieldSaleQueueSql(
  queue: StaffCallsDbQueryParams["queue"],
  staffId: string,
  storeScope = false,
): Prisma.Sql {
  if (queue === "ALL") return Prisma.sql`TRUE`;
  if (queue === "NOT_ANSWERED") {
    return Prisma.sql`fs."lastCallAnswered" = 'NOT_ANSWERED'::"CallAnswerStatus"`;
  }
  if (queue === "FOLLOW_UP") {
    return storeScope
      ? Prisma.sql`EXISTS (
          SELECT 1 FROM "FollowUp" f
          WHERE f."fieldSaleId" = fs.id
            AND f.status = 'OPEN'::"FollowUpStatus"
        )`
      : Prisma.sql`EXISTS (
          SELECT 1 FROM "FollowUp" f
          WHERE f."fieldSaleId" = fs.id
            AND f.status = 'OPEN'::"FollowUpStatus"
            AND f."assignedStaffId" = ${staffId}
        )`;
  }
  return storeScope
    ? Prisma.sql`(
    NOT EXISTS (
      SELECT 1 FROM "FollowUp" f
      WHERE f."fieldSaleId" = fs.id
        AND f.status = 'OPEN'::"FollowUpStatus"
    )
    AND (fs."lastCallAnswered" IS NULL OR fs."lastCallAnswered" <> 'NOT_ANSWERED'::"CallAnswerStatus")
  )`
    : Prisma.sql`(
    NOT EXISTS (
      SELECT 1 FROM "FollowUp" f
      WHERE f."fieldSaleId" = fs.id
        AND f.status = 'OPEN'::"FollowUpStatus"
        AND f."assignedStaffId" = ${staffId}
    )
    AND (fs."lastCallAnswered" IS NULL OR fs."lastCallAnswered" <> 'NOT_ANSWERED'::"CallAnswerStatus")
  )`;
}

function visitSegmentSql(segment: StaffCallsDbQueryParams["segment"]): Prisma.Sql {
  switch (segment) {
    case "NEW":
      return Prisma.sql`v."customerType" = 'NEW'::"CustomerType"`;
    case "RETAINED":
      return Prisma.sql`v."customerType" IN ('REPEAT'::"CustomerType", 'VIP'::"CustomerType")`;
    case "PURCHASED":
      return Prisma.sql`v."purchaseStatus" = 'PURCHASED'::"PurchaseStatus"`;
    case "NOT_PURCHASED":
      return Prisma.sql`v."purchaseStatus" = 'NOT_PURCHASED'::"PurchaseStatus"`;
    default:
      return Prisma.sql`TRUE`;
  }
}

function fieldSaleSegmentSql(segment: StaffCallsDbQueryParams["segment"]): Prisma.Sql {
  switch (segment) {
    case "NEW":
      return Prisma.sql`fs."customerType" = 'NEW'::"CustomerType"`;
    case "RETAINED":
      return Prisma.sql`fs."customerType" IN ('REPEAT'::"CustomerType", 'VIP'::"CustomerType")`;
    case "PURCHASED":
      return Prisma.sql`fs."enrollmentOutcome" IN ('ENROLLED_GHS'::"SchemeEnrollmentOutcome", 'ENROLLED_GPP'::"SchemeEnrollmentOutcome", 'ENROLLED_BOTH'::"SchemeEnrollmentOutcome")`;
    case "NOT_PURCHASED":
      return Prisma.sql`(fs."enrollmentOutcome" IS NULL OR fs."enrollmentOutcome" NOT IN ('ENROLLED_GHS'::"SchemeEnrollmentOutcome", 'ENROLLED_GPP'::"SchemeEnrollmentOutcome", 'ENROLLED_BOTH'::"SchemeEnrollmentOutcome"))`;
    default:
      return Prisma.sql`TRUE`;
  }
}

function valueTierSql(
  alias: "v" | "fs",
  valueTier: StaffCallsDbQueryParams["valueTier"],
): Prisma.Sql {
  if (valueTier === "ALL") return Prisma.sql`TRUE`;
  const col = alias === "v" ? Prisma.sql`v."callValueTier"` : Prisma.sql`fs."callValueTier"`;
  return Prisma.sql`${col} = ${valueTier}::"CallValueTier"`;
}

function birthdaySql(
  alias: "v" | "fs",
  filter: StaffCallsDbQueryParams["birthday"],
  month: number,
): Prisma.Sql {
  if (filter !== "THIS_MONTH") return Prisma.sql`TRUE`;
  const col = alias === "v" ? Prisma.sql`v."birthMonth"` : Prisma.sql`fs."birthMonth"`;
  return Prisma.sql`${col} = ${month}`;
}

function anniversarySql(
  alias: "v" | "fs",
  filter: StaffCallsDbQueryParams["anniversary"],
  month: number,
): Prisma.Sql {
  if (filter !== "THIS_MONTH") return Prisma.sql`TRUE`;
  const col =
    alias === "v" ? Prisma.sql`v."anniversaryMonth"` : Prisma.sql`fs."anniversaryMonth"`;
  return Prisma.sql`${col} = ${month}`;
}

function buildVisitSelectSql(params: StaffCallsDbQueryParams): Prisma.Sql {
  const { start, end } = buildCallsPeriodRange(params.year, params.month);
  const staffFilter = params.storeScope
    ? Prisma.sql`TRUE`
    : Prisma.sql`v."staffId" = ${params.staffId}`;
  return Prisma.sql`
    SELECT v.id, 'VISIT'::text AS source, v."visitDate" AS activity_at
    FROM "Visit" v
    WHERE ${staffFilter}
      AND v."storeId" = ${params.storeId}
      AND v."visitDate" >= ${start}
      AND v."visitDate" <= ${end}
      AND ${visitSourceSql(params.master)}
      AND ${visitSegmentSql(params.segment)}
      AND ${visitQueueSql(params.queue, params.staffId, params.storeScope)}
      AND ${valueTierSql("v", params.valueTier)}
      AND ${birthdaySql("v", params.birthday, params.month)}
      AND ${anniversarySql("v", params.anniversary, params.month)}
  `;
}

function buildFieldSaleSelectSql(params: StaffCallsDbQueryParams): Prisma.Sql {
  const { start, end } = buildCallsPeriodRange(params.year, params.month);
  const staffFilter = params.storeScope
    ? Prisma.sql`TRUE`
    : Prisma.sql`fs."staffId" = ${params.staffId}`;
  return Prisma.sql`
    SELECT fs.id, 'FIELD_SALE'::text AS source, fs."activityDate" AS activity_at
    FROM "FieldSale" fs
    WHERE ${staffFilter}
      AND fs."storeId" = ${params.storeId}
      AND fs."activityDate" >= ${start}
      AND fs."activityDate" <= ${end}
      AND ${fieldSaleSegmentSql(params.segment)}
      AND ${fieldSaleQueueSql(params.queue, params.staffId, params.storeScope)}
      AND ${valueTierSql("fs", params.valueTier)}
      AND ${birthdaySql("fs", params.birthday, params.month)}
      AND ${anniversarySql("fs", params.anniversary, params.month)}
  `;
}

export async function countMergedStaffCalls(params: StaffCallsDbQueryParams): Promise<number> {
  const [visitCount, fieldSaleCount] = await Promise.all([
    shouldQueryVisits(params.master)
      ? prisma.visit.count({ where: buildVisitListWhere(params) })
      : Promise.resolve(0),
    shouldQueryFieldSales(params.master)
      ? prisma.fieldSale.count({ where: buildFieldSaleListWhere(params) })
      : Promise.resolve(0),
  ]);
  return visitCount + fieldSaleCount;
}

export async function fetchMergedStaffCallPageIds(
  params: StaffCallsDbQueryParams,
  skip: number,
  take: number,
): Promise<StaffCallPageRef[]> {
  const includeVisits = shouldQueryVisits(params.master);
  const includeFieldSales = shouldQueryFieldSales(params.master);

  if (!includeVisits && !includeFieldSales) {
    return [];
  }

  if (includeVisits && includeFieldSales) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; source: StaffCallPageSource; activity_at: Date }>
    >(Prisma.sql`
      SELECT id, source, activity_at FROM (
        ${buildVisitSelectSql(params)}
        UNION ALL
        ${buildFieldSaleSelectSql(params)}
      ) merged
      ORDER BY activity_at DESC
      OFFSET ${skip} LIMIT ${take}
    `);
    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      activityAt: row.activity_at,
    }));
  }

  if (includeVisits) {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; source: StaffCallPageSource; activity_at: Date }>
    >(Prisma.sql`
      ${buildVisitSelectSql(params)}
      ORDER BY activity_at DESC
      OFFSET ${skip} LIMIT ${take}
    `);
    return rows.map((row) => ({
      id: row.id,
      source: "VISIT",
      activityAt: row.activity_at,
    }));
  }

  const rows = await prisma.$queryRaw<
    Array<{ id: string; source: StaffCallPageSource; activity_at: Date }>
  >(Prisma.sql`
    ${buildFieldSaleSelectSql(params)}
    ORDER BY activity_at DESC
    OFFSET ${skip} LIMIT ${take}
  `);
  return rows.map((row) => ({
    id: row.id,
    source: "FIELD_SALE",
    activityAt: row.activity_at,
  }));
}

export async function fetchAvailableYears(staffId: string, storeId: string): Promise<number[]> {
  const years = new Set<number>();
  years.add(new Date().getFullYear());

  const rows = await prisma.$queryRaw<Array<{ year: number | null }>>(Prisma.sql`
    SELECT DISTINCT EXTRACT(YEAR FROM "visitDate")::int AS year
    FROM "Visit"
    WHERE "staffId" = ${staffId} AND "storeId" = ${storeId}
    UNION
    SELECT DISTINCT EXTRACT(YEAR FROM "activityDate")::int AS year
    FROM "FieldSale"
    WHERE "staffId" = ${staffId} AND "storeId" = ${storeId}
  `);

  for (const row of rows) {
    if (row.year != null) years.add(row.year);
  }

  return Array.from(years).sort((a, b) => b - a);
}
