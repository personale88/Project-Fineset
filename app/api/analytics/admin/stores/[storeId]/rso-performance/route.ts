import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { assertStoreExists } from "@/lib/services/analytics";
import { getStoreRsoPerformance } from "@/lib/services/rso-performance";
import { getAnalyticsQuerySchema } from "@/lib/validations/analytics.schema";

interface RouteContext {
  params: Promise<{ storeId: string }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const { storeId } = await context.params;
    const exists = await assertStoreExists(storeId);
    if (!exists) return notFound("Store not found");

    const { searchParams } = new URL(req.url);
    const query = getAnalyticsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries()),
    );
    if (!query.success) return badRequest(query.error.flatten());

    const data = await getStoreRsoPerformance(storeId, query.data.period);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
