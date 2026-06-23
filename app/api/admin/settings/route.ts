import { NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/auth/audit";
import { isAdminPortalSession } from "@/lib/auth/require-admin-permission";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import { platformSettingsPatchSchema } from "@/lib/platform/settings-schema";
import {
  getPlatformSettingsResponse,
  updatePlatformSettings,
} from "@/lib/services/platform-settings";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!isAdminPortalSession(session)) {
    return NextResponse.json(
      { message: "Only admin portal users can view platform settings." },
      { status: 403 },
    );
  }

  const payload = await getPlatformSettingsResponse();
  return NextResponse.json(payload);
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can update platform settings." },
      { status: 403 },
    );
  }

  const body: unknown = await req.json();
  const parsed = platformSettingsPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = await updatePlatformSettings(parsed.data, session.email);

  await logAuthEvent({
    event: "PLATFORM_SETTINGS_UPDATED",
    email: session.email,
    authId: session.userId,
    metadata: { sections: Object.keys(parsed.data) },
  });

  return NextResponse.json(payload);
}
