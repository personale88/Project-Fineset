import { prisma } from "@/lib/db/prisma";
import { getPlatformSettings } from "@/lib/services/platform-settings";

export async function purgeExpiredAuthAuditLogs(reference = new Date()): Promise<number> {
  const settings = await getPlatformSettings();
  const cutoff = new Date(reference);
  cutoff.setDate(cutoff.getDate() - settings.security.auditLogRetentionDays);

  const result = await prisma.authAuditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
}
