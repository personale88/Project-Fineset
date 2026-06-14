import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { IMPORT_CONFIG } from "@/lib/import-engine/config";
import type { ImportHistoryRecord } from "@/lib/import-engine/types";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const { searchParams } = new URL(req.url);
    const resolved = await resolvePortalStoreIdForSession(
      session,
      searchParams.get("storeId"),
    );
    if (resolved instanceof NextResponse) return resolved;

    const featureKey = searchParams.get("featureKey") ?? undefined;
    const records = await prisma.importHistory.findMany({
      where: {
        storeId: resolved,
        ...(featureKey ? { featureKey } : {}),
      },
      orderBy: { importedAt: "desc" },
      take: 50,
    });

    const now = Date.now();
    const data: ImportHistoryRecord[] = records.map((record) => ({
      id: record.id,
      batchId: record.batchId,
      featureKey: record.featureKey,
      fileName: record.fileName ?? "",
      totalRows: record.totalRows,
      successCount: record.successCount,
      errorCount: record.errorCount,
      newCustomers: record.newCustomers,
      repeatCustomers: record.repeatCustomers,
      importedBy: record.importedByAuthId,
      importedAt: record.importedAt.toISOString(),
      canRollback:
        !record.rolledBackAt &&
        record.rollbackAvailableUntil.getTime() > now &&
        now - record.importedAt.getTime() <
          IMPORT_CONFIG.rollbackWindowHours * 60 * 60 * 1000,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error);
  }
}
