/**
 * Production/staging migrate hook. Prisma loads prisma.config.ts (which derives DIRECT_URL
 * from DATABASE_URL when only the Supabase :6543 pooler is configured).
 */
import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL?.trim()) {
  console.error("[migrate] DATABASE_URL is not set — skipping migrate deploy.");
  process.exit(1);
}

console.log("[migrate] Running prisma migrate deploy…");

try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  console.log("[migrate] Migrations applied successfully.");
} catch (error) {
  console.error(
    "[migrate] Migration failed. Ensure DIRECT_URL points to Postgres :5432 (not the :6543 pooler).",
  );
  throw error;
}
