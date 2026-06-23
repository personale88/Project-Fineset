import { NextResponse } from "next/server";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { getAnalyticsCreditsSnapshot } from "@/lib/services/analytics-credits";

export async function GET() {
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

  const snapshot = await getAnalyticsCreditsSnapshot(session.userId);
  return NextResponse.json(snapshot);
}
