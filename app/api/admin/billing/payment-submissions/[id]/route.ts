import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { forbidden, getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import {
  BillingPaymentSubmissionError,
  reviewBillingPaymentSubmission,
} from "@/lib/services/billing-payment-submissions";
import { reviewBillingPaymentSubmissionSchema } from "@/lib/validations/billing-payment-submission.schema";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN", "PLATFORM_ADMIN"])) return forbidden();

  const { id } = await context.params;
  const body: unknown = await req.json();
  const parsed = reviewBillingPaymentSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await reviewBillingPaymentSubmission({
      id,
      status: parsed.data.status,
      reviewedByEmail: session.email,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BillingPaymentSubmissionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return handleRouteError(error);
  }
}
