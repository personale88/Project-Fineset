import { NextResponse } from "next/server";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";
import { automationRunRequestSchema } from "@/lib/automation/config-schema";
import {
  AutomationDisabledError,
  AutomationRunConflictError,
} from "@/lib/services/automation-config";

export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return unauthorized();
  if (session.role !== "MASTER_ADMIN") {
    return NextResponse.json(
      { message: "Only master admins can run automations." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

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
    if (error instanceof AutomationDisabledError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error instanceof AutomationRunConflictError) {
      return NextResponse.json(
        { message: error.message, existingRunId: error.existingRunId },
        { status: 409 },
      );
    }
    throw error;
  }
}
