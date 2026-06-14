import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import {
  badRequest,
  getServerSession,
  requireRole,
  unauthorized,
} from "@/lib/auth/session";
import { deduplicateRows } from "@/lib/import-engine/core/deduplicator";
import { getSchemaConfig } from "@/lib/import-engine/schema-configs";
import { createPrismaDedupeClient } from "@/lib/services/import-engine/dedupe-client";
import { importDedupeBodySchema } from "@/lib/validations/import.schema";

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER", "STORE_MANAGER", "MASTER_ADMIN"])) {
      return unauthorized();
    }

    const body = importDedupeBodySchema.safeParse(await req.json());
    if (!body.success) return badRequest(body.error.flatten());

    const resolved = await resolvePortalStoreIdForSession(session, body.data.storeId);
    if (resolved instanceof NextResponse) return resolved;

    const schema = getSchemaConfig(body.data.featureKey);
    if (!schema) return badRequest({ message: "Unknown import feature" });

    const results = await deduplicateRows(
      body.data.rows,
      schema,
      resolved,
      createPrismaDedupeClient(),
    );

    return NextResponse.json({ results });
  } catch (error) {
    return handleRouteError(error);
  }
}
