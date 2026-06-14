import { IMPORT_CONFIG } from "@/lib/import-engine/config";

function stripToDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** Normalise phone to E.164; returns null when invalid */
export function normalisePhone(
  value: string,
  countryCode: string = IMPORT_CONFIG.phoneCountryCode,
): string | null {
  const digits = stripToDigits(value);
  if (!digits) return null;

  const dialCode = countryCode.startsWith("+") ? countryCode.slice(1) : countryCode;

  let normalised = digits;

  if (normalised.length === 10 && !normalised.startsWith(dialCode)) {
    normalised = `${dialCode}${normalised}`;
  } else if (normalised.startsWith("0") && normalised.length === 11) {
    normalised = `${dialCode}${normalised.slice(1)}`;
  } else if (normalised.length === 12 && normalised.startsWith(dialCode)) {
    normalised = normalised;
  } else if (normalised.length < 7 || normalised.length > 15) {
    return null;
  }

  return `+${normalised}`;
}

export function phoneDigitsForHash(value: string): string {
  const normalised = normalisePhone(value);
  if (!normalised) return stripToDigits(value);
  return normalised.replace(/\D/g, "");
}
