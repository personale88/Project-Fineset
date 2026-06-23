import { NextResponse } from "next/server";
import {
  badRequest,
  getServerSession,
  notFound,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { verifyAdminPassword } from "@/lib/auth/verify-admin-password";
import { handleRouteError } from "@/lib/api/route-handler";
import { restoreStore, StoreServiceError } from "@/lib/services/stores";
import { restoreStoreSchema } from "@/lib/validations/store-restore.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Restore a soft-deleted store within the 90-day grace period. */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const body: unknown = await req.json().catch(() => null);
    const parsed = restoreStoreSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.flatten());
    }

    const passwordOk = await verifyAdminPassword(session.email, parsed.data.password);
    if (!passwordOk) {
      return NextResponse.json({ message: "Incorrect admin password." }, { status: 401 });
    }

    const store = await restoreStore(id, session.email);
    return NextResponse.json(store);
  } catch (error) {
    if (error instanceof StoreServiceError && error.status === 404) {
      return notFound(error.message);
    }
    return handleRouteError(error);
  }
}
