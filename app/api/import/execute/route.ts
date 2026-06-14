import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { requireStaffCallsContext } from "@/lib/auth/resolve-staff";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import type { ImportPayload } from "@/lib/import-engine/types";
import { runImport } from "@/lib/services/import-engine/run-import";
import { importExecuteBodySchema } from "@/lib/validations/import.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body = importExecuteBodySchema.safeParse(await req.json());
    if (!body.success) return badRequest(body.error.flatten());

    const resolved = await resolvePortalStoreIdForSession(session, body.data.storeId);
    if (resolved instanceof NextResponse) return resolved;

    const staffContext = await requireStaffCallsContext(session, resolved);

    const payload = body.data as unknown as ImportPayload & {
      storeId: string;
      fileName?: string;
    };

    const result = await runImport({
      ...payload,
      storeId: resolved,
      importedByAuthId: session!.userId,
      fileName: body.data.fileName,
      importingStaffId: staffContext?.staffId ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api.import.execute] failed", { error });
    return handleRouteError(error);
  }
}
