import { NextResponse } from "next/server";
import { InviteError } from "@/lib/auth/invite-user";
import {
  forbidden,
  getServerSession,
  unauthorized,
} from "@/lib/auth/session";
import { checkWriteRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import {
  invitePlatformAdmin,
  listPlatformAdmins,
} from "@/lib/services/platform-admins";
import { platformAdminInviteSchema } from "@/lib/validations/platform-admin.schema";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return forbidden("Only master admins can view internal team members.");
  }

  const data = await listPlatformAdmins();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return forbidden("Only master admins can add internal team members.");
  }

  const identifier = await getRequestIdentifier();
  const writeLimit = await checkWriteRateLimit(identifier);
  if (!writeLimit.success) {
    return NextResponse.json({ message: "Too many requests" }, { status: 429 });
  }

  const body: unknown = await req.json();
  const parsed = platformAdminInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const created = await invitePlatformAdmin(parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InviteError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
