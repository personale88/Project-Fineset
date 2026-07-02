import { NextResponse } from "next/server";
import { refreshVisitAggregate } from "@/lib/analytics/refresh-visit-aggregate";

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

  await refreshVisitAggregate();

  return NextResponse.json({ ok: true, refreshedAt: new Date().toISOString() });
}
