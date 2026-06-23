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
  createBillingFollowUp,
} from "@/lib/services/billing-accounts";
import { createBillingFollowUpSchema } from "@/lib/validations/billing-follow-up.schema";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  const body: unknown = await req.json();
  const parsed = createBillingFollowUpSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const nextFollowUpAt = parsed.data.nextFollowUpAt
    ? new Date(parsed.data.nextFollowUpAt)
    : null;

  try {
    const followUp = await createBillingFollowUp({
      businessKey: parsed.data.businessKey,
      channel: parsed.data.channel,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes,
      nextFollowUpAt,
      createdByEmail: session.email,
      createdByName: null,
    });
    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    if (error instanceof BillingAccountError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
