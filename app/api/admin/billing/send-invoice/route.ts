import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import {
  SendBusinessInvoiceError,
  sendBusinessInvoice,
} from "@/lib/services/send-business-invoice";
import { sendBusinessInvoiceSchema } from "@/lib/validations/billing.schema";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!requireRole(session, ["MASTER_ADMIN"])) return forbidden();

  const body: unknown = await req.json();
  const parsed = sendBusinessInvoiceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const result = await sendBusinessInvoice(
      parsed.data.businessKey,
      session.email,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SendBusinessInvoiceError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
