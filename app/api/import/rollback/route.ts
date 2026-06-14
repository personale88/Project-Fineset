import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { rollbackImport } from "@/lib/services/import-engine/run-import";
import { importRollbackBodySchema } from "@/lib/validations/import.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body = importRollbackBodySchema.safeParse(await req.json());
    if (!body.success) return badRequest(body.error.flatten());

    const result = await rollbackImport(body.data.batchId, session!.userId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
