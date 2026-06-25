import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { forbidden, getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import {
  BillingPaymentSubmissionError,
  createBillingPaymentSubmissionFromPortal,
} from "@/lib/services/billing-payment-submissions";

export async function POST() {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER"])) return forbidden();

  try {
    const submission = await createBillingPaymentSubmissionFromPortal(session);
    return NextResponse.json(submission, { status: 201 });
  } catch (error) {
    if (error instanceof BillingPaymentSubmissionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}
