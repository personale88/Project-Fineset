import { NextResponse } from "next/server";
import {
  forbidden,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { getAdminPortfolioGrowthMetrics } from "@/lib/services/admin-portfolio-growth";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  const data = await getAdminPortfolioGrowthMetrics();
  return NextResponse.json(data);
}
