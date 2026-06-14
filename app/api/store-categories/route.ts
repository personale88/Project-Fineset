import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { listStoreCategoryOptions } from "@/lib/services/store-categories";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return unauthorized();

    const categories = await listStoreCategoryOptions();
    return NextResponse.json({ data: categories });
  } catch (error) {
    return handleRouteError(error);
  }
}
