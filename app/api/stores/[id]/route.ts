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
import {
  getStoreById,
  softDeleteStore,
  StoreServiceError,
  updateStore,
} from "@/lib/services/stores";
import { softDeleteStoreSchema } from "@/lib/validations/store-delete.schema";
import { updateStoreSchema } from "@/lib/validations/store.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

  const store = await getStoreById(id);
  if (!store) return notFound("Store not found");

  return NextResponse.json(store);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

  const body: unknown = await req.json();
  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const store = await updateStore(id, parsed.data);
    return NextResponse.json(store);
  } catch (error) {
    if (error instanceof StoreServiceError) {
      if (error.status === 404) return notFound(error.message);
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const body: unknown = await req.json().catch(() => null);
    const parsed = softDeleteStoreSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.flatten());
    }

    const store = await getStoreById(id);
    if (!store) {
      return notFound("Store not found");
    }

    const nameConfirm = parsed.data.storeNameConfirm.trim();
    if (nameConfirm !== store.name.trim()) {
      return NextResponse.json(
        { message: "Store name does not match. Type the exact store name to confirm." },
        { status: 400 },
      );
    }

    const passwordOk = await verifyAdminPassword(
      session.email,
      parsed.data.password,
    );
    if (!passwordOk) {
      return NextResponse.json(
        { message: "Incorrect admin password." },
        { status: 401 },
      );
    }

    const result = await softDeleteStore(id, session.email);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof StoreServiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}
