import { NextResponse } from "next/server";
import { requireDiagnosticsAccess } from "@/lib/auth/diagnostics-access";
import { prisma } from "@/lib/db/prisma";
import {
  getStoreSchemaHealth,
  isStoreSchemaReady,
} from "@/lib/db/store-schema-health";

function databaseHostFingerprint(url: string): string {
  try {
    const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, "https://"));
    return parsed.hostname;
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

/**
 * Production-safe schema diagnostics — no secrets.
 * GET /api/auth/schema-diagnostics
 */
export async function GET() {
  const denied = await requireDiagnosticsAccess();
  if (denied) return denied;

  const dbUrl = process.env.DATABASE_URL ?? "";
  const directUrl = process.env.DIRECT_URL ?? "";

  let migrationRows: Array<{ migration_name: string; finished_at: Date | null }> = [];
  try {
    migrationRows = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 15
    `;
  } catch (err) {
    console.error("[schema-diagnostics] migrations query failed", err);
  }

  const storeHealth = await getStoreSchemaHealth();
  const storeSchemaOk = await isStoreSchemaReady();

  return NextResponse.json({
    ok: storeSchemaOk,
    databaseHost: databaseHostFingerprint(dbUrl),
    directUrlHost: directUrl ? databaseHostFingerprint(directUrl) : "(not set)",
    hostsMatch:
      Boolean(directUrl) &&
      databaseHostFingerprint(dbUrl) === databaseHostFingerprint(directUrl),
    hasDirectUrl: Boolean(directUrl.trim()),
    store: storeHealth,
    recentMigrations: migrationRows.map((row) => ({
      name: row.migration_name,
      finishedAt: row.finished_at?.toISOString() ?? null,
    })),
    rootCause:
      storeHealth.missingStoreColumns.length > 0
        ? `Production database is missing Store columns: ${storeHealth.missingStoreColumns.join(", ")}. App code was deployed; migrations did not run on this database.`
        : !storeHealth.storeCategoryOptionTableExists
          ? "StoreCategoryOption table is missing. Add Store with category OTHER will fail."
          : !storeHealth.prismaStoreQueryOk
            ? `Prisma cannot query Store: ${storeHealth.prismaStoreQueryError}`
            : storeHealth.storeRowCount > 0
              ? "Schema looks OK and stores exist in DB. If UI is empty, redeploy latest code or check admin session / API errors."
              : "Schema looks OK but Store table has zero rows — creates may have rolled back after invite failure.",
    fix: !storeSchemaOk
      ? "Set DIRECT_URL on Vercel (Supabase direct connection, port 5432), redeploy so build runs prisma migrate deploy, OR run scripts/apply-production-store-schema.sql in the SAME Supabase project as DATABASE_URL, then verify storeSchemaOk here."
      : "No schema fix needed.",
  });
}
