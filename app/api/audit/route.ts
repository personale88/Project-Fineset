import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
    const event = searchParams.get("event") ?? undefined;

    const rows = await prisma.authAuditLog.findMany({
      where: {
        ...(event ? { event } : {}),
        ...(session.role === "BUSINESS_OWNER"
          ? { email: session.email.toLowerCase() }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ data: rows });
  } catch (error) {
    return handleRouteError(error);
  }
}
