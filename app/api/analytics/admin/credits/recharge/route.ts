import { NextResponse } from "next/server";
import { z } from "zod";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { isAnalyticsAskError } from "@/lib/analytics/ask-errors";
import { getAnalyticsCreditPack } from "@/lib/analytics/credit-units";
import { checkWriteRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import { isPaymentError, PaymentNotConfiguredError } from "@/lib/payments/errors";
import { getPaymentProvider } from "@/lib/payments/get-payment-provider";
import { rechargeAnalyticsCredits } from "@/lib/services/analytics-credits";

const bodySchema = z.object({
  packId: z.enum(["starter", "growth", "portfolio"]),
});

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

  const identifier = await getRequestIdentifier();
  const writeLimit = await checkWriteRateLimit(identifier);
  if (!writeLimit.success) {
    return NextResponse.json(
      { message: "Too many recharge attempts. Please try again later." },
      { status: 429 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return badRequest({ message: "Invalid JSON body" });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const pack = getAnalyticsCreditPack(parsed.data.packId);
  if (!pack) {
    return badRequest({ message: "Unknown recharge pack." });
  }

  try {
    const provider = getPaymentProvider();
    const checkout = await provider.completeCreditRecharge({
      appUserId: session.userId,
      packId: pack.id,
      packLabel: pack.label,
      amountInr: pack.priceInr,
      credits: pack.credits,
    });

    const snapshot = await rechargeAnalyticsCredits({
      appUserId: session.userId,
      packId: parsed.data.packId,
      externalPaymentId: checkout.externalPaymentId,
    });

    return NextResponse.json({
      ...snapshot,
      checkoutUrl: checkout.checkoutUrl ?? null,
      paymentProvider: provider.kind,
    });
  } catch (error) {
    if (error instanceof PaymentNotConfiguredError) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 503 },
      );
    }
    if (isPaymentError(error)) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: 402 },
      );
    }
    if (isAnalyticsAskError(error)) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}
