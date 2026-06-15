/**
 * Sync staging Preview env vars to Vercel (Preview scope only).
 *
 * Reads .env.staging.local + GEMINI_API_KEY from .env.local.db.
 * Overrides NEXT_PUBLIC_APP_URL for the staging deploy URL.
 *
 * Prerequisites:
 *   npx vercel login
 *   npx vercel link --project project-fineset
 *   Vercel team must own fineset.staging.tribly.ai (tribly-tech org project).
 *
 * Usage:
 *   node scripts/sync-staging-vercel-preview-env.mjs
 *   node scripts/sync-staging-vercel-preview-env.mjs --dry-run
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const STAGING_APP_URL = "https://fineset.staging.tribly.ai";
const STAGING_DB_REF = "qkfldqzowkcucfdulozc";
const PROD_DB_REF = "mfqpccrzfrptpiclafzu";

const PREVIEW_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ENCRYPTION_KEY",
  "NEXT_PUBLIC_APP_URL",
  "GEMINI_API_KEY",
];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
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
    out[key] = value;
  }
  return out;
}

function assertStagingSafe(vars) {
  for (const key of ["DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
    const v = vars[key] ?? "";
    if (!v) throw new Error(`Missing ${key} in .env.staging.local`);
    if (v.includes(PROD_DB_REF)) {
      throw new Error(
        `${key} looks like production (${PROD_DB_REF}). Refusing to sync.`,
      );
    }
    if (!v.includes(STAGING_DB_REF)) {
      console.warn(`Warning: ${key} does not contain staging ref ${STAGING_DB_REF}`);
    }
  }
}

function vercel(args, input) {
  const result = spawnSync("npx", ["vercel@latest", ...args], {
    input,
    encoding: "utf8",
    shell: true,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const msg = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`vercel ${args.join(" ")} failed:\n${msg}`);
  }
  return result.stdout;
}

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const root = resolve(import.meta.dirname, "..");
  const staging = parseEnvFile(resolve(root, ".env.staging.local"));
  const localDb = parseEnvFile(resolve(root, ".env.local.db"));

  const vars = {
    DATABASE_URL: staging.DATABASE_URL,
    DIRECT_URL: staging.DIRECT_URL,
    NEXT_PUBLIC_SUPABASE_URL: staging.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: staging.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: staging.SUPABASE_SERVICE_ROLE_KEY,
    ENCRYPTION_KEY: staging.ENCRYPTION_KEY,
    NEXT_PUBLIC_APP_URL: STAGING_APP_URL,
    GEMINI_API_KEY: localDb.GEMINI_API_KEY?.trim(),
  };

  assertStagingSafe(vars);

  if (!vars.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY not found in .env.local.db");
  }

  console.log("Preview env vars to sync (values hidden):");
  for (const key of PREVIEW_KEYS) {
    const v = vars[key] ?? "";
    console.log(`  ${key}: ${v ? `[set, len=${v.length}]` : "[MISSING]"}`);
  }

  if (dryRun) {
    console.log("\nDry run — no Vercel changes.");
    return;
  }

  try {
    vercel(["whoami"]);
  } catch {
    throw new Error("Run: npx vercel login");
  }

  if (!existsSync(resolve(root, ".vercel", "project.json"))) {
    throw new Error("Run: npx vercel link --project project-fineset");
  }

  for (const key of PREVIEW_KEYS) {
    const value = vars[key];
    if (!value) continue;
    try {
      vercel(["env", "rm", key, "preview", "--yes"]);
    } catch {
      // missing is fine
    }
    vercel(["env", "add", key, "preview"], `${value}\n`);
    console.log(`Synced ${key} → Preview`);
  }

  console.log("\nDone. Redeploy staging: git push origin staging");
  console.log(
    "Verify: open /api/auth/config-check on staging — databaseHost must include",
    STAGING_DB_REF,
  );
}

main();
