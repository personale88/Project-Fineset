import { getAppBaseUrl } from "@/lib/auth/get-app-url";
import { sendMail } from "@/lib/email/send-mail";

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;

  await sendMail({
    to: email,
    subject: "Reset your FineSet password",
    text: `Reset your password by opening this link (valid for 1 hour):\n\n${url}\n\nIf you did not request this, ignore this email.`,
    html: `<p>Reset your password by clicking the link below (valid for 1 hour):</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, ignore this email.</p>`,
  });
}

export async function sendInviteEmail(
  email: string,
  name: string,
  token: string,
): Promise<void> {
  const url = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(token)}&invite=1`;

  await sendMail({
    to: email,
    subject: "You're invited to FineSet",
    text: `Hello ${name},\n\nSet up your FineSet account password:\n\n${url}\n\nThis link expires in 7 days.`,
    html: `<p>Hello ${name},</p><p>Set up your FineSet account password:</p><p><a href="${url}">Activate account</a></p><p>This link expires in 7 days.</p>`,
  });
}

export async function sendTestEmail(to: string): Promise<void> {
  await sendMail({
    to,
    subject: "FineSet SMTP test",
    text: "SMTP configuration is working.",
    html: "<p>SMTP configuration is working.</p>",
  });
}
