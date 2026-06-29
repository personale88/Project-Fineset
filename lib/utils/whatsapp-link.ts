const DEFAULT_COUNTRY_CODE = "91";

export function normalizeWhatsAppPhone(
  phone: string,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  const dialCode = countryCode.replace(/\D/g, "");
  if (!dialCode) return null;

  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith(dialCode) && digits.length > dialCode.length) {
    const localLength = digits.length - dialCode.length;
    if (localLength >= 7 && localLength <= 12) return digits;
  }

  if (digits.length === 10) {
    return `${dialCode}${digits}`;
  }

  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function buildWhatsAppUrl(
  phone: string,
  message: string,
  countryCode: string = DEFAULT_COUNTRY_CODE,
): string | null {
  const normalized = normalizeWhatsAppPhone(phone, countryCode);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildTelHref(phone: string, countryCode: string = DEFAULT_COUNTRY_CODE): string | null {
  const normalized = normalizeWhatsAppPhone(phone, countryCode);
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
