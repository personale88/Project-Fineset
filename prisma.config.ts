import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

/** Minimal .env loader for Prisma CLI (config mode skips automatic loading). */
function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;

  const text = readFileSync(filePath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));
loadEnvFile(resolve(process.cwd(), ".env"));

/** Supabase/Railway often set only the :6543 pooler URL — migrations need :5432 session/direct. */
function deriveDirectUrlFromDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.port === "6543") {
      url.port = "5432";
    }
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    const normalized = url.toString();
    return normalized.endsWith("?") ? normalized.slice(0, -1) : normalized;
  } catch {
    return databaseUrl
      .replace(":6543", ":5432")
      .replace(/([?&])pgbouncer=true&?/g, "$1")
      .replace(/([?&])connection_limit=[0-9]+&?/g, "$1")
      .replace(/[?&]$/, "");
  }
}

function logDatabaseTarget(label: string, connectionUrl: string): void {
  try {
    const url = new URL(connectionUrl);
    console.log(
      `[prisma.config] ${label}: ${url.hostname}:${url.port || "5432"}/${url.pathname.replace(/^\//, "")}`,
    );
  } catch {
    console.log(`[prisma.config] ${label}: (configured)`);
  }
}

if (!process.env.DIRECT_URL?.trim() && process.env.DATABASE_URL?.trim()) {
  process.env.DIRECT_URL = deriveDirectUrlFromDatabaseUrl(process.env.DATABASE_URL);
  console.warn(
    "[prisma.config] DIRECT_URL not set — derived a session/direct URL from DATABASE_URL for migrations.",
  );
  logDatabaseTarget("DIRECT_URL", process.env.DIRECT_URL);
} else if (process.env.DIRECT_URL?.trim()) {
  logDatabaseTarget("DIRECT_URL", process.env.DIRECT_URL);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "dotenv -e .env.local -- tsx prisma/seed.ts",
  },
});
