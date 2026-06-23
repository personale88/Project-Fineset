import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const ANALYTICS_ASK_EVENT_PREFIX = "ANALYTICS_ASK_";

function analyticsEventFromStatus(status: string): string {
  return `${ANALYTICS_ASK_EVENT_PREFIX}${status.toUpperCase()}`;
}

function analyticsStatusFromEvent(event: string): string | null {
  if (!event.startsWith(ANALYTICS_ASK_EVENT_PREFIX)) return null;
  return event.slice(ANALYTICS_ASK_EVENT_PREFIX.length).toLowerCase();
}

interface UnifiedAuditRow {
  id: string;
  event: string;
  email: string | null;
  ip: string | null;
  createdAt: string;
  metadata: unknown;
  source: "auth" | "analytics";
}

async function fetchAuthAuditRows(params: {
  page: number;
  pageSize: number;
  event?: string;
  emailQuery?: string;
  ownerEmailOnly?: string;
}): Promise<{ rows: UnifiedAuditRow[]; total: number }> {
  const where: Prisma.AuthAuditLogWhereInput = {
    ...(params.event ? { event: params.event } : {}),
    ...(params.ownerEmailOnly
      ? { email: params.ownerEmailOnly }
      : params.emailQuery
        ? { email: { contains: params.emailQuery, mode: "insensitive" } }
        : {}),
  };

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    prisma.authAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.pageSize,
    }),
    prisma.authAuditLog.count({ where }),
  ]);

  return {
    rows: rows.map((row) => ({
      id: row.id,
      event: row.event,
      email: row.email,
      ip: row.ip,
      createdAt: row.createdAt.toISOString(),
      metadata: row.metadata,
      source: "auth" as const,
    })),
    total,
  };
}

async function fetchAnalyticsAskRows(params: {
  page: number;
  pageSize: number;
  event?: string;
  emailQuery?: string;
}): Promise<{ rows: UnifiedAuditRow[]; total: number }> {
  const statusFilter = params.event ? analyticsStatusFromEvent(params.event) : null;
  if (params.event && !statusFilter) {
    return { rows: [], total: 0 };
  }

  const where: Prisma.AnalyticsAskLogWhereInput = {
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  if (params.emailQuery) {
    const adminUserIds = (
      await prisma.appUser.findMany({
        where: {
          email: { contains: params.emailQuery, mode: "insensitive" },
          role: "MASTER_ADMIN",
        },
        select: { id: true },
      })
    ).map((user) => user.id);

    if (adminUserIds.length === 0) {
      return { rows: [], total: 0 };
    }

    where.appUserId = { in: adminUserIds };
  }

  const skip = (params.page - 1) * params.pageSize;
  const [rows, total] = await Promise.all([
    prisma.analyticsAskLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: params.pageSize,
    }),
    prisma.analyticsAskLog.count({ where }),
  ]);

  const userIds = [...new Set(rows.map((row) => row.appUserId))];
  const users =
    userIds.length > 0
      ? await prisma.appUser.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true },
        })
      : [];
  const emailByUserId = new Map(users.map((user) => [user.id, user.email]));

  return {
    rows: rows.map((row) => ({
      id: row.id,
      event: analyticsEventFromStatus(row.status),
      email: emailByUserId.get(row.appUserId) ?? null,
      ip: null,
      createdAt: row.createdAt.toISOString(),
      metadata: {
        promptLength: row.promptLength,
        parseSource: row.parseSource,
        parseConfidence: row.parseConfidence,
        dataAvailability: row.dataAvailability,
        durationMs: row.durationMs,
        intentTokensIn: row.intentTokensIn,
        intentTokensOut: row.intentTokensOut,
        reportTokensIn: row.reportTokensIn,
        reportTokensOut: row.reportTokensOut,
        totalCostUsd: row.totalCostUsd,
        errorCode: row.errorCode,
      },
      source: "analytics" as const,
    })),
    total,
  };
}

async function fetchMergedAuditRows(params: {
  page: number;
  pageSize: number;
  event?: string;
  emailQuery?: string;
}): Promise<{ rows: UnifiedAuditRow[]; total: number }> {
  const fetchSize = params.page * params.pageSize;
  const [authResult, analyticsResult] = await Promise.all([
    fetchAuthAuditRows({
      page: 1,
      pageSize: fetchSize,
      event: params.event,
      emailQuery: params.emailQuery,
    }),
    fetchAnalyticsAskRows({
      page: 1,
      pageSize: fetchSize,
      event: params.event,
      emailQuery: params.emailQuery,
    }),
  ]);

  const merged = [...authResult.rows, ...analyticsResult.rows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const start = (params.page - 1) * params.pageSize;
  const rows = merged.slice(start, start + params.pageSize);
  const total = authResult.total + analyticsResult.total;

  return { rows, total };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));
    const event = searchParams.get("event") ?? undefined;
    const emailQuery = searchParams.get("email")?.trim().toLowerCase();
    const source = searchParams.get("source") ?? "auth";

    if (session.role === "BUSINESS_OWNER" && source !== "auth") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const ownerEmailOnly =
      session.role === "BUSINESS_OWNER" ? session.email.toLowerCase() : undefined;

    let result: { rows: UnifiedAuditRow[]; total: number };

    if (source === "analytics") {
      result = await fetchAnalyticsAskRows({ page, pageSize, event, emailQuery });
    } else if (source === "all") {
      result = await fetchMergedAuditRows({ page, pageSize, event, emailQuery });
    } else {
      result = await fetchAuthAuditRows({
        page,
        pageSize,
        event,
        emailQuery,
        ownerEmailOnly,
      });
    }

    return NextResponse.json({
      data: result.rows,
      total: result.total,
      page,
      pageSize,
      source,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
