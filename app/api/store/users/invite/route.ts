import { NextResponse } from "next/server";
import { InviteError, inviteUser } from "@/lib/auth/invite-user";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  forbidden,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { storeInviteUserSchema } from "@/lib/validations/user-invite.schema";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["BUSINESS_OWNER"])) return forbidden();

  const body: unknown = await req.json();
  const parsed = storeInviteUserSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const { searchParams } = new URL(req.url);
  const resolved = await resolvePortalStoreIdForSession(
    session,
    searchParams.get("storeId"),
  );
  if (resolved instanceof NextResponse) return resolved;

  try {
    const result = await inviteUser({
      ...parsed.data,
      role: "STAFF",
      storeId: resolved,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
