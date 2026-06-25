import { NextResponse } from "next/server";
import { z } from "zod";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { checkWriteRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import {
  AnalyticsCreditPaymentSubmissionError,
  buildAnalyticsCreditPayNow,
  createAnalyticsCreditPaymentSubmission,
} from "@/lib/services/analytics-credit-payment-submissions";
import { getAnalyticsCreditsSnapshot } from "@/lib/services/analytics-credits";

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

  try {
    const submission = await createAnalyticsCreditPaymentSubmission(
      session,
      parsed.data.packId,
    );
    const snapshot = await getAnalyticsCreditsSnapshot(session.userId);
    return NextResponse.json({ submission, snapshot });
  } catch (error) {
    if (error instanceof AnalyticsCreditPaymentSubmissionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

  const packId = new URL(req.url).searchParams.get("packId")?.trim();
  if (!packId) {
    return badRequest({ message: "packId is required." });
  }

  try {
    const preview = await buildAnalyticsCreditPayNow(packId);
    return NextResponse.json(preview);
  } catch (error) {
    if (error instanceof AnalyticsCreditPaymentSubmissionError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    throw error;
  }
}
