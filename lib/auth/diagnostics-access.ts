import { isProduction } from "@/lib/env";
import { getServerSession, requireRole } from "@/lib/auth/session";
import { NextResponse } from "next/server";

/**
 * Diagnostics endpoints are restricted to MASTER_ADMIN unless explicitly opened for staging.
 */
export async function requireDiagnosticsAccess(): Promise<NextResponse | null> {
  const allowPublic =
    process.env.ALLOW_PUBLIC_DIAGNOSTICS === "true" && !isProduction();

  if (allowPublic) {
    return null;
  }

  const session = await getServerSession();
  if (!requireRole(session, ["MASTER_ADMIN"])) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  return null;
}
