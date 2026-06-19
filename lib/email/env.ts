import { z } from "zod";
import { optionalEnv } from "@/lib/env/optional-env";

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1),
  password: z.string().min(1),
  from: z.string().min(1),
  secure: z.boolean(),
  requireTls: z.boolean(),
  connectionTimeoutMs: z.coerce.number().int().positive().default(10_000),
  greetingTimeoutMs: z.coerce.number().int().positive().default(10_000),
});

export type SmtpConfig = z.infer<typeof smtpSchema>;

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  return value.trim().toLowerCase() === "true";
}

export function getSmtpConfigFromEnv(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.replace(/\s+/g, "").trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !portRaw || !user || !password || !from) {
    return null;
  }

  const port = Number(portRaw);
  const secure = parseBool(process.env.SMTP_SECURE, port === 465);
  const requireTls = parseBool(process.env.SMTP_REQUIRE_TLS, port === 587);

  if (secure && port === 587) {
    console.warn("[email] SMTP_SECURE=true with port 587 is unusual; use 465 for SSL or STARTTLS on 587");
  }

  const parsed = smtpSchema.safeParse({
    host,
    port,
    user,
    password,
    from,
    secure,
    requireTls,
    connectionTimeoutMs: process.env.SMTP_CONNECTION_TIMEOUT_MS ?? 10_000,
    greetingTimeoutMs: process.env.SMTP_GREETING_TIMEOUT_MS ?? 10_000,
  });

  if (!parsed.success) {
    console.error("[email] Invalid SMTP config", parsed.error.flatten().fieldErrors);
    return null;
  }

  return parsed.data;
}

export function isSmtpConfigured(): boolean {
  return getSmtpConfigFromEnv() !== null;
}

/** Re-export for env schema composition */
export function getSmtpHostForDiagnostics(): string | null {
  return process.env.SMTP_HOST?.trim() ?? null;
}
