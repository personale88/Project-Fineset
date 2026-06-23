import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";
import {
  applyDirectUrlNormalization,
  logDatabaseTarget,
} from "./lib/db/normalize-direct-url";

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

applyDirectUrlNormalization(process.env);

if (process.env.DIRECT_URL?.trim()) {
  logDatabaseTarget("DIRECT_URL", process.env.DIRECT_URL);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "dotenv -e .env.local -- tsx prisma/seed.ts",
  },
});
