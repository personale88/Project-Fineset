import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { InviteError } from "@/lib/auth/invite-user";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { createStore, listStores } from "@/lib/services/stores";
import { createStoreSchema, getStoresQuerySchema } from "@/lib/validations/store.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const { searchParams } = new URL(req.url);
    const query = getStoresQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    const { data, total } = await listStores({
      page: query.data.page,
      pageSize: query.data.pageSize,
      search: query.data.search,
      activeOnly: query.data.activeOnly,
      includeDeleted: query.data.includeDeleted,
      period: query.data.period,
    });

    return NextResponse.json({
      data,
      total,
      page: query.data.page,
      pageSize: query.data.pageSize,
    });
  } catch (error) {
    console.error("[api.stores] list failed", error);
    return handleRouteError(error);
  }
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const body: unknown = await req.json();
    let parsed: ReturnType<typeof createStoreSchema.safeParse>;
    try {
      parsed = createStoreSchema.safeParse(body);
    } catch (parseError) {
      console.error("[api.stores] schema parse threw", parseError);
      return badRequest({}, "Invalid store details");
    }
    if (!parsed.success) {
      const flattened = parsed.error.flatten();
      const fieldMessages = Object.values(flattened.fieldErrors)
        .flat()
        .filter((msg): msg is string => Boolean(msg));
      const message = fieldMessages[0] ?? "Invalid store details";
      return badRequest(flattened, message);
    }

    const result = await createStore(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientInitializationError) {
      console.error("[api.stores] create failed — database auth", {
        elapsedMs: Date.now() - startedAt,
        error,
      });
      return NextResponse.json(
        {
          message:
            "Database connection failed. Fix DATABASE_URL and DIRECT_URL (password URL-encoded if it contains @), then restart the app.",
        },
        { status: 503 },
      );
    }
    console.error("[api.stores] create failed", {
      elapsedMs: Date.now() - startedAt,
      error,
    });
    return handleRouteError(error);
  }
}
