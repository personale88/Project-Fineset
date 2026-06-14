import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { importVisitsFromCsv } from "@/lib/services/visit-import";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) return unauthorized();

    const { searchParams } = new URL(req.url);
    const resolved = await resolvePortalStoreIdForSession(
      session,
      searchParams.get("storeId"),
    );
    if (resolved instanceof NextResponse) return resolved;

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return badRequest({ message: "Invalid multipart form data" });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return badRequest({ message: "CSV file is required" });
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return badRequest({ message: "Please upload a .csv file" });
    }

    const csv = await file.text();
    if (!csv.trim()) {
      return badRequest({ message: "CSV file is empty" });
    }

    const result = await importVisitsFromCsv({
      csv,
      storeId: resolved,
    });

    void import("@/lib/auth/audit").then(({ logAuthEvent }) =>
      logAuthEvent({
        event: "VISIT_IMPORT",
        email: session.email,
        metadata: {
          storeId: resolved,
          createdCount: result.createdCount,
          failedCount: result.failedCount,
        },
      }),
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
