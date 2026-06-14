const EMPTY_PLACEHOLDERS = new Set([
  "-",
  "—",
  "–",
  "−",
  "n/a",
  "na",
  "nil",
  "none",
  "null",
  ".",
  "..",
  "unknown",
  "tbd",
  "tba",
  "xxx",
]);

const PLACEHOLDER_TEXT = /^(n\/?a|nil|none|null|unknown|na|tbd|tba|xxx)[\s.\-–—−]*$/i;

/** Spreadsheet sentinels that should be treated as blank cells. */
export function isEmptyPlaceholder(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  if (normalised.length === 0) return true;
  if (EMPTY_PLACEHOLDERS.has(normalised)) return true;
  if (PLACEHOLDER_TEXT.test(normalised)) return true;

  // Repeated dashes, dots, or spaces only (e.g. "- - - -", "----", ". . .")
  if (/^[\s.\-–—−]+$/.test(normalised)) return true;

  return false;
}

export function normalizeRawValue(raw: string | null): string | null {
  if (raw === null) return null;
  if (isEmptyPlaceholder(raw)) return null;
  return raw.trim();
}
