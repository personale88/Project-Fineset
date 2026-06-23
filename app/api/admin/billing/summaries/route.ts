import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import {
  BillingAccountError,
  getBillingSummaries,
} from "@/lib/services/billing-accounts";

export async function GET() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  try {
    const summaries = await getBillingSummaries();
    return NextResponse.json({ data: summaries });
  } catch (error) {
    if (error instanceof BillingAccountError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
