import { NextResponse } from "next/server";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";
import { automationRunRequestSchema } from "@/lib/automation/config-schema";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can run automations." },
      { status: 403 },
    );
  }

  const body: unknown = await req.json().catch(() => ({}));
  const parsed = automationRunRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await runBillingAutomation({
    trigger: parsed.data.dryRun ? "DRY_RUN" : "MANUAL",
    dryRun: parsed.data.dryRun,
    triggeredByEmail: session.email,
  });

  return NextResponse.json(result);
}
