import { NextResponse } from "next/server";
import { AutomationRunBlockedError } from "@/lib/automation/run-request";
import { isAdminPortalSession } from "@/lib/auth/require-admin-permission";
import { forbidden, getServerSession, unauthorized } from "@/lib/auth/session";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";
import { automationRunRequestSchema } from "@/lib/automation/config-schema";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (!isAdminPortalSession(session)) {
    return forbidden();
  }
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

  try {
    const result = await runBillingAutomation({
      trigger: parsed.data.dryRun ? "DRY_RUN" : "MANUAL",
      dryRun: parsed.data.dryRun,
      triggeredByEmail: session.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AutomationRunBlockedError) {
      return NextResponse.json({ message: error.message }, { status: 403 });
    }
    throw error;
  }
}
