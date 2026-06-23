import { NextResponse } from "next/server";
import { z } from "zod";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { isAnalyticsAskError } from "@/lib/analytics/ask-errors";
import { checkWriteRateLimit, getRequestIdentifier } from "@/lib/rate-limit";
import {
  getAnalyticsCreditsSnapshot,
  grantAnalyticsCredits,
} from "@/lib/services/analytics-credits";

const bodySchema = z.object({
  credits: z.number().int().min(1).max(10_000),
  description: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

  const identifier = await getRequestIdentifier();
  const writeLimit = await checkWriteRateLimit(identifier);
  if (!writeLimit.success) {
    return NextResponse.json(
      { message: "Too many grant attempts. Please try again later." },
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
    await grantAnalyticsCredits({
      appUserId: session.userId,
      credits: parsed.data.credits,
      description:
        parsed.data.description?.trim() ||
        `Manual grant of ${parsed.data.credits} credits`,
    });

    const snapshot = await getAnalyticsCreditsSnapshot(session.userId);
    return NextResponse.json(snapshot);
  } catch (error) {
    if (isAnalyticsAskError(error)) {
      return NextResponse.json(
        { code: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    throw error;
  }
}
