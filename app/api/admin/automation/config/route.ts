import { NextResponse } from "next/server";
import {
  adminPermissionForbidden,
  requireAdminPermission,
} from "@/lib/auth/require-admin-permission";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import {
  AutomationConfigConflictError,
  AutomationConfigValidationError,
  getAutomationConfigForApi,
  updateAutomationConfig,
} from "@/lib/services/automation-config";
import { automationConfigPatchSchema } from "@/lib/automation/config-schema";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireAdminPermission(session, "billing")) {
    return adminPermissionForbidden();
  }

  const config = await getAutomationConfigForApi();
  return NextResponse.json(config);
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can update automation settings." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const parsed = automationConfigPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const config = await updateAutomationConfig(parsed.data, session.email);
    return NextResponse.json(config);
  } catch (error) {
    if (error instanceof AutomationConfigValidationError) {
      return NextResponse.json(
        {
          message: error.message,
          details: { formErrors: [], fieldErrors: { [error.path.join(".")]: [error.message] } },
        },
        { status: 400 },
      );
    }
    if (error instanceof AutomationConfigConflictError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    throw error;
  }
}
