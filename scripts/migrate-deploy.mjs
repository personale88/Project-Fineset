/**
 * Production/staging migrate hook. Prisma loads prisma.config.ts (which derives DIRECT_URL
 * from DATABASE_URL when only the Supabase :6543 pooler is configured).
 */
import { execSync } from "node:child_process";
import {
  applyDirectUrlNormalization,
  logDatabaseTarget,
} from "./normalize-database-url.mjs";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("[migrate] DATABASE_URL is not set — skipping migrate deploy.");
  process.exit(1);
}

applyDirectUrlNormalization(process.env);
if (process.env.DIRECT_URL?.trim()) {
  logDatabaseTarget("DIRECT_URL", process.env.DIRECT_URL);
}

console.log("[migrate] Running prisma migrate deploy…");

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("[migrate] Migrations applied successfully.");
} catch (error) {
  console.error(
    "[migrate] Migration failed. Check DATABASE_URL/DIRECT_URL credentials and that Postgres :5432 is reachable.",
  );
  throw error;
}

try {
  execSync("node scripts/refresh-visit-aggregate.mjs", { stdio: "inherit" });
} catch (error) {
  console.warn("[migrate] visit_daily_aggregate refresh failed (non-fatal).", error);
}
