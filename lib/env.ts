import { z } from "zod";
import { optionalEnv } from "@/lib/env/optional-env";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: optionalEnv(z.string().min(1).optional()),
  DIRECT_URL: optionalEnv(z.string().min(1).optional()),
  NEXT_PUBLIC_APP_URL: optionalEnv(z.string().url().optional()),
  AUTH_SECRET: optionalEnv(z.string().min(1).optional()),
  NEXTAUTH_SECRET: optionalEnv(z.string().min(1).optional()),
  ENCRYPTION_KEY: optionalEnv(z.string().length(64).optional()),
  SMTP_HOST: optionalEnv(z.string().min(1).optional()),
  SMTP_PORT: optionalEnv(z.string().optional()),
  SMTP_USER: optionalEnv(z.string().min(1).optional()),
  SMTP_PASSWORD: optionalEnv(z.string().min(1).optional()),
  SMTP_FROM: optionalEnv(z.string().min(1).optional()),
  SMTP_SECURE: optionalEnv(z.string().optional()),
  SMTP_REQUIRE_TLS: optionalEnv(z.string().optional()),
  SMTP_CONNECTION_TIMEOUT_MS: optionalEnv(z.string().optional()),
  SMTP_GREETING_TIMEOUT_MS: optionalEnv(z.string().optional()),
  UPSTASH_REDIS_REST_URL: optionalEnv(z.string().url().optional()),
  UPSTASH_REDIS_REST_TOKEN: optionalEnv(z.string().min(1).optional()),
  SENTRY_DSN: optionalEnv(z.string().url().optional()),
  SENTRY_ENVIRONMENT: optionalEnv(z.string().min(1).optional()),
  SENTRY_RELEASE: optionalEnv(z.string().min(1).optional()),
  MASTER_ADMIN_EMAIL: optionalEnv(z.string().email().optional()),
  MASTER_ADMIN_PASSWORD: optionalEnv(z.string().min(8).optional()),
  MASTER_ADMIN_NAME: optionalEnv(z.string().min(1).optional()),
  SKIP_ENV_VALIDATION: optionalEnv(z.string().optional()),
  PAYMENT_PROVIDER: optionalEnv(
    z.enum(["none", "noop", "razorpay", "stripe"]).optional(),
  ),
  ALLOW_ADMIN_IMPERSONATION: optionalEnv(z.string().optional()),
});

export type Env = z.infer<typeof envSchema>;

let validated = false;

function hasEnv(name: string): boolean {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "";
}

export function validateEnv(): void {
  if (validated) return;
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    validated = true;
    return;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }

  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const missing: string[] = [];

    if (!hasEnv("DATABASE_URL")) missing.push("DATABASE_URL");
    if (!hasEnv("AUTH_SECRET") && !hasEnv("NEXTAUTH_SECRET")) {
      missing.push("AUTH_SECRET");
    }
    if (!hasEnv("ENCRYPTION_KEY")) missing.push("ENCRYPTION_KEY");

    const smtpMissing: string[] = [];
    if (!hasEnv("SMTP_HOST")) smtpMissing.push("SMTP_HOST");
    if (!hasEnv("SMTP_PORT")) smtpMissing.push("SMTP_PORT");
    if (!hasEnv("SMTP_USER")) smtpMissing.push("SMTP_USER");
    if (!hasEnv("SMTP_PASSWORD")) smtpMissing.push("SMTP_PASSWORD");
    if (!hasEnv("SMTP_FROM")) smtpMissing.push("SMTP_FROM");
    if (smtpMissing.length > 0) {
      missing.push(...smtpMissing);
    }

    if (missing.length > 0) {
      const message = `Missing required production environment variables: ${missing.join(", ")}. Add them to your server environment file and restart the app.`;
      console.error(`[env] ${message}`);
      throw new Error(message);
    }

    const recommended: string[] = [];
    if (!hasEnv("UPSTASH_REDIS_REST_URL")) recommended.push("UPSTASH_REDIS_REST_URL");
    if (!hasEnv("UPSTASH_REDIS_REST_TOKEN")) {
      recommended.push("UPSTASH_REDIS_REST_TOKEN");
    }
    if (!hasEnv("NEXT_PUBLIC_APP_URL")) recommended.push("NEXT_PUBLIC_APP_URL");
    if (!hasEnv("SENTRY_DSN")) recommended.push("SENTRY_DSN");

    if (recommended.length > 0) {
      console.warn(
        `[env] Recommended production variables not set (app runs with reduced functionality): ${recommended.join(", ")}`,
      );
    }

    if (!hasEnv("UPSTASH_REDIS_REST_URL") || !hasEnv("UPSTASH_REDIS_REST_TOKEN")) {
      console.warn(
        "[env] Upstash Redis is required for production rate limiting and cross-instance SSE sync.",
      );
    }
  }

  validated = true;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
