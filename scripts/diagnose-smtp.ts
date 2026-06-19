/**
 * Send a test email via configured SMTP.
 *
 * Usage: npm run auth:diagnose-smtp
 */
import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { sendTestEmail } from "../lib/email/templates/auth-emails";
import { verifySmtpConnection } from "../lib/email/send-mail";

loadDotenv({ path: resolve(process.cwd(), ".env.local") });

async function main(): Promise<void> {
  const to =
    process.env.MASTER_ADMIN_EMAIL?.trim() ??
    process.env.SMTP_USER?.trim();

  if (!to) {
    throw new Error("Set MASTER_ADMIN_EMAIL or SMTP_USER in .env.local");
  }

  await verifySmtpConnection();
  console.log("SMTP connection OK");

  await sendTestEmail(to);
  console.log(`Test email sent to ${to}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
