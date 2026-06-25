import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp-link";

export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "WhatsAppSendError";
  }
}

export function isWhatsAppApiConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

export async function sendWhatsAppTextMessage(params: {
  toPhone: string;
  message: string;
}): Promise<void> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

  if (!accessToken || !phoneNumberId) {
    throw new WhatsAppSendError("WhatsApp API is not configured.", 503);
  }

  const normalized = normalizeWhatsAppPhone(params.toPhone);
  if (!normalized) {
    throw new WhatsAppSendError("The phone number on file is not valid for WhatsApp.", 400);
  }

  const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalized,
      type: "text",
      text: { body: params.message },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new WhatsAppSendError(
      body.trim() || `WhatsApp send failed with status ${response.status}.`,
      502,
    );
  }
}
