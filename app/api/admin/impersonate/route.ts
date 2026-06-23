import { NextResponse } from "next/server";
import {
  clearImpersonationCookieOnResponse,
  isImpersonationAllowedForPlatform,
  setImpersonationCookieOnResponse,
  startImpersonation,
  stopImpersonation,
  validateImpersonationStore,
} from "@/lib/auth/impersonation";
import {
  badRequest,
  forbidden,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { z } from "zod";

const bodySchema = z.object({
  storeId: z.string().cuid().nullable(),
});

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  if (!(await isImpersonationAllowedForPlatform())) {
    return forbidden(
      "Store impersonation is disabled. Enable it in Master Settings or set ALLOW_ADMIN_IMPERSONATION=true.",
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest({ message: "Invalid JSON body" });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const responseBody: Record<string, unknown> = { ok: true };

  if (parsed.data.storeId === null) {
    await stopImpersonation({
      adminEmail: session.email,
      adminAuthId: session.userId,
    });
    const response = NextResponse.json(responseBody);
    await clearImpersonationCookieOnResponse(response);
    return response;
  }

  const storeId = parsed.data.storeId;
  const valid = await validateImpersonationStore(storeId);
  if (!valid) {
    return NextResponse.json({ message: "Store not found or deleted." }, { status: 404 });
  }

  const started = await startImpersonation({
    storeId,
    adminEmail: session.email,
    adminAuthId: session.userId,
  });
  if (!started) {
    return NextResponse.json({ message: "Store not found." }, { status: 404 });
  }

  responseBody.storeId = started.storeId;
  responseBody.storeName = started.storeName;

  const response = NextResponse.json(responseBody);
  await setImpersonationCookieOnResponse(response, started.storeId);
  return response;
}
