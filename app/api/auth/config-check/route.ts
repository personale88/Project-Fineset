import { NextResponse } from "next/server";
import { requireDiagnosticsAccess } from "@/lib/auth/diagnostics-access";
import { getCustomerSchemaHealth } from "@/lib/db/customer-schema-health";
import { ensureProductionCustomerSchema } from "@/lib/db/ensure-production-customer-schema";
import {
  ensureProductionStoreSchema,
  getDatabaseHostForDiagnostics,
} from "@/lib/db/ensure-production-store-schema";
import { prisma } from "@/lib/db/prisma";
import { getSmtpHostForDiagnostics, isSmtpConfigured } from "@/lib/email/env";

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

  const hasAuthSecret = Boolean(
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim(),
  );
  const smtpConfigured = isSmtpConfigured();
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
      hasAuthSecret &&
      smtpConfigured &&
      storeSchemaOk &&
      customerSchemaOk,
    checks: {
      hasDatabaseUrl: dbUrl.length > 0,
      databaseUrlLikelyBroken: dbUrlLikelyBroken,
      databaseConnected: dbOk,
      databaseError: dbError,
      hasAuthSecret,
      smtpConfigured,
      smtpHost: getSmtpHostForDiagnostics(),
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
      ? `Production DB missing customer/visit profile columns (Customer: ${(customerHealth?.missingCustomerColumns ?? []).join(", ") || "none"}; Visit: ${(customerHealth?.missingVisitColumns ?? []).join(", ") || "none"}). Run scripts/apply-production-customer-schema.sql or npm run db:migrate.`
      : !storeSchemaOk
      ? `Production DB (host ${getDatabaseHostForDiagnostics()}) missing columns: ${missingStoreColumns.join(", ")}. Run npm run db:migrate or scripts/apply-production-store-schema.sql.`
      : dbUrlLikelyBroken
        ? "DATABASE_URL password contains @ — encode as %40 in env vars."
        : !dbOk
          ? "Database unreachable — fix DATABASE_URL and restart the app."
          : !hasAuthSecret
            ? "Set AUTH_SECRET in your environment file."
            : !smtpConfigured
              ? "Set SMTP_* variables for invite and password-reset emails."
              : "Env looks OK.",
  });
}
