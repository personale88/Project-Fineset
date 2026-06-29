import { NextResponse } from "next/server";
import {
  adminPermissionForbidden,
  isAdminPortalSession,
  requireAdminPermission,
} from "@/lib/auth/require-admin-permission";
import { forbidden, getServerSession, unauthorized } from "@/lib/auth/session";
import {
  getAutomationConfig,
  updateAutomationConfig,
} from "@/lib/services/automation-config";
import { automationConfigPatchSchema } from "@/lib/automation/config-schema";
import { zodErrorToFlattenDetails } from "@/lib/automation/config-field-errors";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!isAdminPortalSession(session)) {
    return forbidden();
  }
  if (!requireAdminPermission(session, "billing")) {
    return adminPermissionForbidden();
  }

  const config = await getAutomationConfig({ fresh: true });
  return NextResponse.json(config);
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!isAdminPortalSession(session)) {
    return forbidden();
  }
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can update automation settings." },
      { status: 403 },
    );
  }

  const body: unknown = await req.json();
  const parsed = automationConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: zodErrorToFlattenDetails(parsed.error) },
      { status: 400 },
    );
  }

  const config = await updateAutomationConfig(parsed.data, session.email);
  return NextResponse.json(config);
}
