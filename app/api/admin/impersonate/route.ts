import { NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  isImpersonationAllowed,
  startStoreImpersonation,
  stopStoreImpersonation,
} from "@/lib/auth/impersonation";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  storeId: z.string().cuid().nullable(),
});

export async function POST(req: Request) {
  try {
    if (!isImpersonationAllowed()) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return badRequest(parsed.error.flatten());

    if (parsed.data.storeId === null) {
      await stopStoreImpersonation(session.email);
      return NextResponse.json({ ok: true });
    }

    const store = await prisma.store.findUnique({
      where: { id: parsed.data.storeId },
      select: { id: true, name: true },
    });
    if (!store) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    await startStoreImpersonation({
      adminSession: session,
      storeId: store.id,
      storeName: store.name,
    });

    return NextResponse.json({ ok: true, storeId: store.id });
  } catch (error) {
    return handleRouteError(error);
  }
}
