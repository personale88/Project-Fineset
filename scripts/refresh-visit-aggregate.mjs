/**
 * Post-migrate hook: rebuild visit_daily_aggregate from live Visit rows.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe("SELECT refresh_visit_aggregate()");
  console.log("[refresh-visit-aggregate] Materialized view refreshed.");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn("[refresh-visit-aggregate] Skipped or failed:", message);
} finally {
  await prisma.$disconnect();
}
