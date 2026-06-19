import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getSmtpConfigFromEnv, type SmtpConfig } from "@/lib/email/env";

let cachedKey: string | null = null;
let cachedTransport: Transporter | null = null;

function configKey(config: SmtpConfig): string {
  return `${config.host}:${config.port}:${config.user}:${config.secure}:${config.requireTls}`;
}

export function createSmtpTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTls,
    auth: {
      user: config.user,
      pass: config.password,
    },
    connectionTimeout: config.connectionTimeoutMs,
    greetingTimeout: config.greetingTimeoutMs,
  });
}

export function getSmtpTransporter(): Transporter | null {
  const config = getSmtpConfigFromEnv();
  if (!config) {
    return null;
  }

  const key = configKey(config);
  if (cachedTransport && cachedKey === key) {
    return cachedTransport;
  }

  cachedTransport = createSmtpTransporter(config);
  cachedKey = key;
  return cachedTransport;
}

/** Test-only reset */
export function resetSmtpTransporterCacheForTests(): void {
  cachedKey = null;
  cachedTransport = null;
}
