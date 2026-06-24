const DEFAULT_COUNTRY_CODE = "91";

export function normalizeWhatsAppPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  if (digits.length === 12 && digits.startsWith(DEFAULT_COUNTRY_CODE)) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

export function buildWhatsAppUrl(phone: string, message: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildTelHref(phone: string): string | null {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return null;
  return `tel:+${normalized}`;
}

export function formatSupportPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length > 10 && trimmed.startsWith("+")) {
    return trimmed;
  }
  return trimmed;
}
