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
  getBillingAccountDetail,
  updateBillingPaymentStatus,
} from "@/lib/services/billing-accounts";
import {
  billingAccountQuerySchema,
  updateBillingAccountSchema,
} from "@/lib/validations/billing-follow-up.schema";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  const url = new URL(req.url);
  const parsed = billingAccountQuerySchema.safeParse({
    businessKey: url.searchParams.get("businessKey"),
  });
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const detail = await getBillingAccountDetail(parsed.data.businessKey);
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof BillingAccountError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  const body: unknown = await req.json();
  const parsed = updateBillingAccountSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const detail = await updateBillingPaymentStatus({
      businessKey: parsed.data.businessKey,
      paymentStatus: parsed.data.paymentStatus,
      notes: parsed.data.notes,
      createdByEmail: session.email,
      createdByName: null,
    });
    return NextResponse.json(detail);
  } catch (error) {
    if (error instanceof BillingAccountError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
