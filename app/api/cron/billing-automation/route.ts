import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { purgeExpiredAuthAuditLogs } from "@/lib/services/audit-retention";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";
import {
  AutomationRunConflictError,
  recoverStaleAutomationRuns,
} from "@/lib/services/automation-config";

function isValidCronBearer(authHeader: string | null, cronSecret: string): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  const expected = Buffer.from(cronSecret, "utf8");
  const received = Buffer.from(token, "utf8");
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      { message: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (!isValidCronBearer(authHeader, cronSecret)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const purgedAuditLogs = await purgeExpiredAuthAuditLogs();
  const recoveredStaleRuns = await recoverStaleAutomationRuns();

  try {
    const result = await runBillingAutomation({
      trigger: "CRON",
      triggeredByEmail: "cron@fineset.local",
    });

    return NextResponse.json({ ...result, purgedAuditLogs, recoveredStaleRuns });
  } catch (error) {
    if (error instanceof AutomationRunConflictError) {
      return NextResponse.json(
        {
          message: error.message,
          existingRunId: error.existingRunId,
          purgedAuditLogs,
          recoveredStaleRuns,
        },
        { status: 409 },
      );
    }
    throw error;
  }
}
