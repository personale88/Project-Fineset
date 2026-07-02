import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { AppSession } from "@/types";
import { captureServerError } from "@/lib/monitoring/capture-error";
import {
  runWithTenantRlsContext,
  tenantRlsContextFromSession,
} from "@/lib/db/tenant-rls";
import {
  badRequest,
  forbidden,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";

type Role = AppSession["role"];

async function runWithSessionTenantContext<T>(
  session: AppSession,
  handler: () => Promise<T>,
): Promise<T> {
  return runWithTenantRlsContext(tenantRlsContextFromSession(session), handler);
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    const message = String(error.message ?? "");
    if (
      /Authentication failed against database server|ECIRCUITBREAKER|too many authentication failures/i.test(
        message,
      )
    ) {
      return NextResponse.json(
        { message: "Database connection is temporarily unavailable" },
        { status: 503 },
      );
    }
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Resource already exists", code: error.code },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return notFound();
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { message: "Cannot delete: related records still exist", code: error.code },
        { status: 409 },
      );
    }
    if (error.code === "P2021" || error.code === "P2022") {
      const column =
        typeof error.meta === "object" &&
        error.meta !== null &&
        "column" in error.meta
          ? String((error.meta as { column?: string }).column ?? "")
          : "";
      return NextResponse.json(
        {
          message: column
            ? `Database missing column "${column}". Run npm run db:migrate, or apply scripts/apply-production-store-schema.sql on the production database.`
            : "Database schema is out of date. Run npm run db:migrate or apply scripts/apply-production-store-schema.sql.",
          code: error.code,
          column: column || undefined,
        },
        { status: 503 },
      );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    const detail = error.message ?? "";
    const staleClient =
      /Unknown argument `phone`/i.test(detail) &&
      /model Staff/i.test(detail);
    const message = staleClient
      ? "Server is using an outdated database client. Run `npm run db:generate`, restart `npm run dev`, then try again."
      : "Invalid data for the database. Check required fields and try again.";
    return NextResponse.json(
      {
        message,
        code: "PRISMA_VALIDATION",
      },
      { status: staleClient ? 503 : 400 },
    );
  }

  console.error("[api]", error);
  captureServerError(error, { tags: { layer: "api" } });
  const detail =
    error instanceof Error ? error.message.slice(0, 300) : "Unknown error";
  return NextResponse.json(
    { message: "Internal server error", detail },
    { status: 500 },
  );
}

export async function withAuth<T extends Role>(
  allowed: readonly T[],
  handler: (session: Extract<AppSession, { role: T }>, req: Request) => Promise<NextResponse>,
): Promise<(req: Request) => Promise<NextResponse>> {
  return async (req: Request) => {
    try {
      const session = await getServerSession();
      if (!session) return unauthorized();
      if (!requireRole(session, allowed)) return forbidden();
      return await runWithSessionTenantContext(session, () =>
        handler(session as Extract<AppSession, { role: T }>, req),
      );
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export function withAuthQuery<T extends Role, S extends z.ZodType>(
  allowed: readonly T[],
  schema: S,
  handler: (
    session: Extract<AppSession, { role: T }>,
    query: z.infer<S>,
    req: Request,
  ) => Promise<NextResponse>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    try {
      const session = await getServerSession();
      if (!session) return unauthorized();
      if (!requireRole(session, allowed)) return forbidden();

      const { searchParams } = new URL(req.url);
      const parsed = schema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!parsed.success) return badRequest(parsed.error.flatten());

      return await handler(
        session as Extract<AppSession, { role: T }>,
        parsed.data,
        req,
      );
    } catch (error) {
      return handleRouteError(error);
    }
  };
}

export async function withAuthValidation<T extends Role, S extends z.ZodType>(
  allowed: readonly T[],
  schema: S,
  handler: (
    session: Extract<AppSession, { role: T }>,
    data: z.infer<S>,
    req: Request,
  ) => Promise<NextResponse>,
): Promise<(req: Request) => Promise<NextResponse>> {
  return async (req: Request) => {
    try {
      const session = await getServerSession();
      if (!session) return unauthorized();
      if (!requireRole(session, allowed)) return forbidden();

      const body: unknown = await req.json();
      const parsed = schema.safeParse(body);
      if (!parsed.success) return badRequest(parsed.error.flatten());

      return await handler(
        session as Extract<AppSession, { role: T }>,
        parsed.data,
        req,
      );
    } catch (error) {
      return handleRouteError(error);
    }
  };
}
