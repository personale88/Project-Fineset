import { IMPORT_CONFIG } from "@/lib/import-engine/config";
import { isEmptyPlaceholder, normalizeRawValue } from "@/lib/import-engine/utils/emptyPlaceholder";

const MULTI_PHONE_SPLIT = /[/,;|&]|(?:\s+or\s+)|(?:\s+and\s+)/i;

function stripToDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function phoneCandidates(value: string): string[] {
  const parts = value
    .split(MULTI_PHONE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [value.trim()];
}

function normaliseSinglePhone(
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

/** Normalise phone to E.164; returns null when invalid */
export function normalisePhone(
  value: string,
  countryCode: string = IMPORT_CONFIG.phoneCountryCode,
): string | null {
  if (isEmptyPlaceholder(value)) return null;

  for (const candidate of phoneCandidates(value)) {
    if (isEmptyPlaceholder(candidate)) continue;
    const normalised = normaliseSinglePhone(candidate, countryCode);
    if (normalised) return normalised;
  }
  return null;
}

export function phoneDigitsForHash(value: string): string {
  const normalised = normalisePhone(value);
  if (!normalised) return stripToDigits(value.split(/[/,;|&]/)[0] ?? value);
  return normalised.replace(/\D/g, "");
}

/** Normalise a raw spreadsheet phone for dedupe and import; null when empty or invalid. */
export function resolveImportPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const normalized = normalizeRawValue(raw);
  if (!normalized) return null;
  return normalisePhone(normalized);
}
