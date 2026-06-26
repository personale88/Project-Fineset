import { NextResponse } from "next/server";
import {
  adminPermissionForbidden,
  requireAdminPermission,
} from "@/lib/auth/require-admin-permission";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import { listAutomationRuns } from "@/lib/services/automation-config";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireAdminPermission(session, "billing")) {
    return adminPermissionForbidden();
  }

  const { searchParams } = new URL(req.url);
  const pageRaw = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const pageSizeRaw = Number.parseInt(searchParams.get("pageSize") ?? "20", 10);
  const page = Number.isFinite(pageRaw) ? pageRaw : 1;
  const pageSize = Number.isFinite(pageSizeRaw) ? pageSizeRaw : 20;

  const data = await listAutomationRuns(page, pageSize);
  return NextResponse.json(data);
}
