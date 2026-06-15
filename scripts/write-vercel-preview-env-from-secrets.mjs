/**
 * Write .vercel/.env.preview.local from STAGING_* process.env (GitHub Actions secrets).
 * No-op when STAGING_DATABASE_URL is unset.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const STAGING_APP_URL = "https://fineset.staging.tribly.ai";
const STAGING_DB_REF = "qkfldqzowkcucfdulozc";
const PROD_DB_REF = "mfqpccrzfrptpiclafzu";

const MAP = [
  ["DATABASE_URL", "STAGING_DATABASE_URL"],
  ["DIRECT_URL", "STAGING_DIRECT_URL"],
  ["NEXT_PUBLIC_SUPABASE_URL", "STAGING_NEXT_PUBLIC_SUPABASE_URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  ["SUPABASE_SERVICE_ROLE_KEY", "STAGING_SUPABASE_SERVICE_ROLE_KEY"],
  ["ENCRYPTION_KEY", "STAGING_ENCRYPTION_KEY"],
  ["GEMINI_API_KEY", "STAGING_GEMINI_API_KEY"],
];

function main() {
  const databaseUrl = process.env.STAGING_DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.log(
      "STAGING_DATABASE_URL not set — skip preview env injection. Add GitHub secrets per docs/VERCEL_STAGING_DEPLOY.md",
    );
    return;
  }

  for (const [vercelKey, secretKey] of MAP) {
    const v = process.env[secretKey]?.trim();
    if (!v) {
      throw new Error(`Missing GitHub secret: ${secretKey}`);
    }
    if (
      (vercelKey === "DATABASE_URL" ||
        vercelKey === "DIRECT_URL" ||
        vercelKey === "NEXT_PUBLIC_SUPABASE_URL") &&
      v.includes(PROD_DB_REF)
    ) {
      throw new Error(`${secretKey} contains production ref ${PROD_DB_REF}`);
    }
  }

  const lines = [];
  for (const [vercelKey, secretKey] of MAP) {
    lines.push(`${vercelKey}=${process.env[secretKey].trim()}`);
  }
  lines.push(`NEXT_PUBLIC_APP_URL=${STAGING_APP_URL}`);

  const root = resolve(import.meta.dirname, "..");
  const vercelDir = resolve(root, ".vercel");
  mkdirSync(vercelDir, { recursive: true });
  const outPath = resolve(vercelDir, ".env.preview.local");
  writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

  console.log(`Wrote ${outPath} (${lines.length} vars, staging ref ${STAGING_DB_REF})`);
}

main();
