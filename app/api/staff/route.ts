import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolveStorePortalStoreId } from "@/lib/auth/resolve-manager-store-id";
import { InviteError } from "@/lib/auth/invite-user";
import { createStaff, getStaffPerformance, listStaff } from "@/lib/services/staff";
import { createStaffSchema } from "@/lib/validations/staff.schema";
import { getStaffQuerySchema } from "@/lib/validations/staff-query.schema";

export async function GET(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "MASTER_ADMIN", "STORE_MANAGER"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const query = getStaffQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    if (query.data.performance === "true") {
      let storeId: string | undefined;
      if (session.role === "BUSINESS_OWNER" || session.role === "STORE_MANAGER") {
        const resolved = await resolveStorePortalStoreId(
          session,
          query.data.storeId,
        );
        if (resolved instanceof NextResponse) return resolved;
        storeId = resolved;
      } else {
        storeId = query.data.storeId ?? undefined;
      }
      const data = await getStaffPerformance(storeId);
      return NextResponse.json(data);
    }

    if (session.role === "BUSINESS_OWNER" || session.role === "STORE_MANAGER") {
      const resolved = await resolveStorePortalStoreId(
        session,
        query.data.storeId,
      );
      if (resolved instanceof NextResponse) return resolved;
      const data = await listStaff(resolved);
      return NextResponse.json(data);
    }

    const storeId = query.data.storeId;
    if (!storeId) {
      const data = await getStaffPerformance();
      return NextResponse.json(data);
    }

    const data = await listStaff(storeId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api.staff] failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER"])) return unauthorized();

    const body: unknown = await req.json();
    const parsed = createStaffSchema.safeParse(body);
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const fieldMessages = Object.values(flattened.fieldErrors)
        .flat()
        .filter((msg): msg is string => Boolean(msg));
      const message = fieldMessages[0] ?? "Invalid staff details";
      return badRequest(flattened, message);
    }

    const { searchParams } = new URL(req.url);
    const resolved = await resolveStorePortalStoreId(
      session,
      searchParams.get("storeId") ?? undefined,
    );
    if (resolved instanceof NextResponse) return resolved;

    const staff = await createStaff(resolved, parsed.data);
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("[api.staff] create failed — database auth", {
        elapsedMs: Date.now() - startedAt,
        error,
      });
      return NextResponse.json(
        {
          message:
            "Database connection failed. Fix Vercel DATABASE_URL and DIRECT_URL (correct Supabase password, % encoded as %25), then redeploy.",
        },
        { status: 503 },
      );
    }
    console.error("[api.staff] create failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}
