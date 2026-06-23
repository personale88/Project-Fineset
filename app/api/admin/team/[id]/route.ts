import { NextResponse } from "next/server";
import { InviteError } from "@/lib/auth/invite-user";
import { forbidden, getServerSession, unauthorized } from "@/lib/auth/session";
import { updatePlatformAdmin } from "@/lib/services/platform-admins";
import { platformAdminUpdateSchema } from "@/lib/validations/platform-admin.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return forbidden("Only master admins can update internal team members.");
  }

  const { id } = await params;
  const body: unknown = await req.json();
  const parsed = platformAdminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const updated = await updatePlatformAdmin(id, parsed.data, session.userId);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
