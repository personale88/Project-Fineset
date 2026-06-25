import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { forbidden, getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import {
  countPendingBillingPaymentSubmissions,
  listBillingPaymentSubmissions,
} from "@/lib/services/billing-payment-submissions";
import { listBillingPaymentSubmissionsQuerySchema } from "@/lib/validations/billing-payment-submission.schema";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session) return unauthorized();
    if (!requireRole(session, ["MASTER_ADMIN", "PLATFORM_ADMIN"])) return forbidden();

    const url = new URL(req.url);
    const parsed = listBillingPaymentSubmissionsQuerySchema.safeParse({
      status: url.searchParams.get("status") || undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid query." }, { status: 400 });
    }

    const [data, pendingCount] = await Promise.all([
      listBillingPaymentSubmissions({
        status: parsed.data.status ?? "PENDING",
      }),
      countPendingBillingPaymentSubmissions(),
    ]);

    return NextResponse.json({ data, pendingCount });
  } catch (error) {
    return handleRouteError(error);
  }
}
