import { config as loadDotenv } from "dotenv";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaClientMtimeMs?: number;
  prismaSchemaMtimeMs?: number;
  prismaMtimeCheckedAt?: number;
};

const GENERATED_CLIENT_PATH = resolve(
  process.cwd(),
  "node_modules/.prisma/client/index.js",
);
const SCHEMA_PATH = resolve(process.cwd(), "prisma/schema.prisma");

/** Turbopack workers may start before Next injects .env.local — load it in dev. */
function ensureDatabaseEnvLoaded(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  if (process.env.NODE_ENV === "production") return;
  loadDotenv({ path: resolve(process.cwd(), ".env.local") });
}

function createPrismaClient(): PrismaClient {
  ensureDatabaseEnvLoaded();
  const url = process.env.DATABASE_URL ?? "";
  const directUrl = process.env.DIRECT_URL ?? "";
  if (
    process.env.NODE_ENV === "production" &&
    url.includes("connection_limit=1")
  ) {
    console.warn(
      "[prisma] DATABASE_URL uses connection_limit=1 — increase pool size to avoid timeouts (P2024).",
    );
  }
  if (
    process.env.NODE_ENV === "production" &&
    directUrl.length > 0 &&
    !directUrl.includes(":5432")
  ) {
    console.warn(
      "[prisma] DIRECT_URL should use port :5432 for migrations and schema tooling.",
    );
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function fileMtimeMs(path: string): number | undefined {
  if (!existsSync(path)) return undefined;
  return statSync(path).mtimeMs;
}

function prismaArtifactsMtimeMs(): {
  clientMtime?: number;
  schemaMtime?: number;
} {
  return {
    clientMtime: fileMtimeMs(GENERATED_CLIENT_PATH),
    schemaMtime: fileMtimeMs(SCHEMA_PATH),
  };
}

/** How often to re-check schema/client mtimes in dev (ms). Avoids statSync on every query. */
const DEV_MTIME_CHECK_INTERVAL_MS = 5_000;

function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createPrismaClient();
    }
    return globalForPrisma.prisma;
  }

  // Fast path: return existing client if we checked recently.
  const now = Date.now();
  const lastCheck = globalForPrisma.prismaMtimeCheckedAt ?? 0;
  if (globalForPrisma.prisma && now - lastCheck < DEV_MTIME_CHECK_INTERVAL_MS) {
    return globalForPrisma.prisma;
  }

  globalForPrisma.prismaMtimeCheckedAt = now;

  const { clientMtime, schemaMtime } = prismaArtifactsMtimeMs();
  const schemaAheadOfClient =
    schemaMtime !== undefined &&
    clientMtime !== undefined &&
    schemaMtime > clientMtime;
  const cacheIsFresh =
    globalForPrisma.prisma !== undefined &&
    !schemaAheadOfClient &&
    globalForPrisma.prismaClientMtimeMs === clientMtime &&
    globalForPrisma.prismaSchemaMtimeMs === schemaMtime;

  if (cacheIsFresh && globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }

  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaClientMtimeMs = clientMtime;
  globalForPrisma.prismaSchemaMtimeMs = schemaMtime;
  return globalForPrisma.prisma;
}

/** Re-resolve periodically so `prisma generate` picks up without a full dev restart. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});
