import { NextResponse } from "next/server";
import {
  adminPermissionForbidden,
  isAdminPortalSession,
  requireAdminPermission,
} from "@/lib/auth/require-admin-permission";
import { forbidden, getServerSession, unauthorized } from "@/lib/auth/session";
import { listAutomationRuns } from "@/lib/services/automation-config";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!isAdminPortalSession(session)) {
    return forbidden();
  }
  if (!requireAdminPermission(session, "billing")) {
    return adminPermissionForbidden();
  }

  const { searchParams } = new URL(req.url);
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "20", 10);

  const data = await listAutomationRuns(page, pageSize);
  return NextResponse.json(data);
}
