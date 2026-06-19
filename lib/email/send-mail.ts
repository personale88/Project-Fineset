import { getSmtpConfigFromEnv, isSmtpConfigured } from "@/lib/email/env";
import {
  mapNodemailerError,
  SmtpNotConfiguredError,
  SmtpSendError,
} from "@/lib/email/errors";
import { getSmtpTransporter } from "@/lib/email/transporter";

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendMailResult {
  messageId?: string;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (!isSmtpConfigured()) {
    throw new SmtpNotConfiguredError();
  }

  const config = getSmtpConfigFromEnv();
  const transporter = getSmtpTransporter();
  if (!config || !transporter) {
    throw new SmtpNotConfiguredError();
  }

  try {
    const info = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { messageId: info.messageId };
  } catch (error) {
    const mapped = mapNodemailerError(error);
    console.error("[email.smtp] send failed", {
      to: input.to,
      subject: input.subject,
      error: mapped.message,
    });
    throw mapped instanceof SmtpSendError ? mapped : new SmtpSendError(mapped.message);
  }
}

export async function verifySmtpConnection(): Promise<void> {
  const transporter = getSmtpTransporter();
  if (!transporter) {
    throw new SmtpNotConfiguredError();
  }

  try {
    await transporter.verify();
  } catch (error) {
    throw mapNodemailerError(error);
  }
}
