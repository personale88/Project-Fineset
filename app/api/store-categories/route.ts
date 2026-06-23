import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { isAdminPortalSession } from "@/lib/auth/require-admin-permission";
import { getServerSession, unauthorized } from "@/lib/auth/session";
import { listStoreCategoryChoices } from "@/lib/services/store-categories";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) return unauthorized();
    if (!isAdminPortalSession(session)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const choices = await listStoreCategoryChoices();
    return NextResponse.json({ choices });
  } catch (error) {
    return handleRouteError(error);
  }
}
