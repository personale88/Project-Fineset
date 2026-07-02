import { NextResponse } from "next/server";
import { getServerSession, requireRole, unauthorized } from "@/lib/auth/session";
import { handleRouteError } from "@/lib/api/route-handler";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { getActiveLocationCaptureException } from "@/lib/services/location-capture-exceptions";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF"])) return unauthorized();

    const staff = await requireStaffContext(session);
    if (!staff) return unauthorized();

    const { searchParams } = new URL(req.url);
    const recordType = searchParams.get("recordType");
    if (recordType !== "FIELD_SALE" && recordType !== "VISIT") {
      return NextResponse.json({ message: "recordType is required" }, { status: 400 });
    }

    const exception = await getActiveLocationCaptureException({
      storeId: staff.storeId,
      staffId: staff.staffId,
      recordType,
    });

    return NextResponse.json(exception);
  } catch (error) {
    return handleRouteError(error);
  }
}
