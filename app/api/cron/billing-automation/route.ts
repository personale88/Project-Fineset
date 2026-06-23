import { NextResponse } from "next/server";
import { purgeExpiredAuthAuditLogs } from "@/lib/services/audit-retention";
import { runBillingAutomation } from "@/lib/services/run-billing-automation";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    return NextResponse.json(
      { message: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const purgedAuditLogs = await purgeExpiredAuthAuditLogs();

  const result = await runBillingAutomation({
    trigger: "CRON",
    triggeredByEmail: "cron@fineset.local",
  });

  return NextResponse.json({ ...result, purgedAuditLogs });
}
