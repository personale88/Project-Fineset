import { NextResponse } from "next/server";
import { requireDiagnosticsAccess } from "@/lib/auth/diagnostics-access";
import { getCustomerSchemaHealth } from "@/lib/db/customer-schema-health";
import { ensureProductionCustomerSchema } from "@/lib/db/ensure-production-customer-schema";
import {
  ensureProductionStoreSchema,
  getDatabaseHostForDiagnostics,
} from "@/lib/db/ensure-production-store-schema";
import { prisma } from "@/lib/db/prisma";

const REQUIRED_STORE_COLUMNS = [
  "pincode",
  "businessOwnerName",
  "businessOwnerEmail",
  "customCategory",
] as const;

async function getStoreSchemaHealth() {
  const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Store'
    ORDER BY column_name
  `;
  const storeColumns = rows.map((row) => row.column_name);
  const present = new Set(storeColumns);
  const missingStoreColumns = REQUIRED_STORE_COLUMNS.filter(
    (column) => !present.has(column),
  );

  const tableRows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'StoreCategoryOption'
    ) AS exists
  `;
  const storeCategoryOptionTableExists = Boolean(tableRows[0]?.exists);

  let storeRowCount = 0;
  try {
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count FROM "Store"
    `;
    storeRowCount = Number(count[0]?.count ?? 0);
  } catch {
    storeRowCount = -1;
  }

  let prismaStoreQueryOk = false;
  try {
    await prisma.store.findFirst({ select: { id: true } });
    prismaStoreQueryOk = true;
  } catch {
    prismaStoreQueryOk = false;
  }

  return {
    missingStoreColumns,
    storeColumns,
    storeCategoryOptionTableExists,
    storeRowCount,
    prismaStoreQueryOk,
  };
}

/**
 * Safe production debug — no secrets returned.
 * GET /api/auth/config-check
 */
export async function GET() {
  const denied = await requireDiagnosticsAccess();
  if (denied) return denied;

  const dbUrl = process.env.DATABASE_URL ?? "";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  let dbOk = false;
  let dbError: string | null = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Database connection failed";
  }

  const dbUrlLikelyBroken =
    dbUrl.length > 0 &&
    /^postgres(ql)?:\/\/[^:]+:[^@]+@[^@]+@/.test(dbUrl);

  let supabaseHost = "";
  try {
    supabaseHost = new URL(supabaseUrl).hostname;
  } catch {
    supabaseHost = "(invalid URL)";
  }

  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  const hasDirectUrl = Boolean(process.env.DIRECT_URL?.trim());

  let storeHealth: Awaited<ReturnType<typeof getStoreSchemaHealth>> | null = null;
  let storeSchemaOk = false;
  let customerHealth: Awaited<ReturnType<typeof getCustomerSchemaHealth>> | null =
    null;
  let customerSchemaOk = false;
  if (dbOk) {
    try {
      await ensureProductionStoreSchema();
      storeHealth = await getStoreSchemaHealth();
      storeSchemaOk =
        storeHealth.missingStoreColumns.length === 0 &&
        storeHealth.storeCategoryOptionTableExists &&
        storeHealth.prismaStoreQueryOk;
    } catch (err) {
      console.error("[config-check] store schema probe failed", err);
    }
    try {
      await ensureProductionCustomerSchema();
      customerHealth = await getCustomerSchemaHealth();
      customerSchemaOk =
        customerHealth.missingCustomerColumns.length === 0 &&
        customerHealth.missingVisitColumns.length === 0 &&
        customerHealth.prismaCustomerQueryOk;
    } catch (err) {
      console.error("[config-check] customer schema probe failed", err);
    }
  }
  const missingStoreColumns = storeHealth?.missingStoreColumns ?? [];

  return NextResponse.json({
    ok:
      dbOk &&
      !dbUrlLikelyBroken &&
      Boolean(supabaseUrl) &&
      hasServiceRole &&
      storeSchemaOk &&
      customerSchemaOk,
    checks: {
      hasDatabaseUrl: dbUrl.length > 0,
      databaseUrlLikelyBroken: dbUrlLikelyBroken,
      databaseConnected: dbOk,
      databaseError: dbError,
      hasSupabaseUrl: supabaseUrl.length > 0,
      supabaseHost,
      hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      hasServiceRoleKey: hasServiceRole,
      staffCreateNeedsServiceRole:
        "POST /api/staff requires SUPABASE_SERVICE_ROLE_KEY to create login users",
      appUrl: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "(not set)",
      nodeEnv: process.env.NODE_ENV,
      hasDirectUrl,
      databaseHost: getDatabaseHostForDiagnostics(),
      storeSchemaOk,
      missingStoreColumns,
      storeColumns: storeHealth?.storeColumns,
      storeCategoryOptionTableExists: storeHealth?.storeCategoryOptionTableExists,
      storeRowCount: storeHealth?.storeRowCount,
      prismaStoreQueryOk: storeHealth?.prismaStoreQueryOk,
      customerSchemaOk,
      missingCustomerColumns: customerHealth?.missingCustomerColumns ?? [],
      missingVisitColumns: customerHealth?.missingVisitColumns ?? [],
      prismaCustomerQueryOk: customerHealth?.prismaCustomerQueryOk,
    },
    hint: !customerSchemaOk
      ? `Production DB missing customer/visit profile columns (Customer: ${(customerHealth?.missingCustomerColumns ?? []).join(", ") || "none"}; Visit: ${(customerHealth?.missingVisitColumns ?? []).join(", ") || "none"}). Run scripts/apply-production-customer-schema.sql or redeploy with DIRECT_URL set.`
      : !storeSchemaOk
      ? `Production DB (host ${getDatabaseHostForDiagnostics()}) missing columns: ${missingStoreColumns.join(", ")}. Set Vercel DIRECT_URL to Supabase Session pooler :5432, redeploy, or run scripts/apply-production-store-schema.sql on that exact project.`
      : dbUrlLikelyBroken
        ? "DATABASE_URL password contains @ — encode as %40 in Vercel env vars."
        : !dbOk
          ? "Database unreachable — fix DATABASE_URL on Vercel and redeploy."
          : !supabaseUrl
            ? "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY on Vercel, then redeploy."
            : !hasServiceRole
              ? "Add SUPABASE_SERVICE_ROLE_KEY on Vercel — required for Add Staff (Supabase Auth)."
              : "Env looks OK — if Add Staff still fails, open Vercel logs for [api.staff] create failed.",
  });
}
