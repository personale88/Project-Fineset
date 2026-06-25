import { isImpersonationAllowed } from "@/lib/auth/impersonation";
import { getSmtpHostForDiagnostics, isSmtpConfigured } from "@/lib/email/env";
import { prisma } from "@/lib/db/prisma";
import type { PlatformIntegrationStatus } from "@/lib/platform/types";

export async function getPlatformIntegrationStatus(): Promise<PlatformIntegrationStatus> {
  let databaseConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;
  } catch {
    databaseConnected = false;
  }

  const paymentProvider = process.env.PAYMENT_PROVIDER?.trim() || "none";
  const paymentConfigured =
    paymentProvider !== "none" && paymentProvider !== "noop";

  const whatsAppApiConfigured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );

  return {
    smtp: {
      configured: isSmtpConfigured(),
      host: getSmtpHostForDiagnostics(),
    },
    whatsapp: {
      configured: true,
      mode: whatsAppApiConfigured ? "api" : "deep_links",
    },
    redis: {
      configured: Boolean(
        process.env.UPSTASH_REDIS_REST_URL?.trim() &&
          process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
      ),
    },
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    },
    paymentProvider: {
      provider: paymentProvider,
      configured: paymentConfigured,
    },
    cron: {
      secretConfigured: Boolean(process.env.CRON_SECRET?.trim()),
    },
    database: {
      connected: databaseConnected,
    },
    impersonationEnvDefault: isImpersonationAllowed(),
  };
}
