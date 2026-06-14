/** Map spreadsheet text to a known enum value, using keys and optional display labels. */
export function normalizeEnumValue(
  raw: string,
  allowedValues: readonly string[],
  labels?: Record<string, string>,
): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const compact = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if (allowedValues.includes(compact)) return compact;

  const caseMatch = allowedValues.find(
    (value) => value.toLowerCase() === trimmed.toLowerCase(),
  );
  if (caseMatch) return caseMatch;

  const spacedKey = trimmed.toLowerCase().replace(/[\s-]+/g, "_");
  const spacedMatch = allowedValues.find((value) => value.toLowerCase() === spacedKey);
  if (spacedMatch) return spacedMatch;

  if (labels) {
    const lower = trimmed.toLowerCase();
    for (const [value, label] of Object.entries(labels)) {
      if (label.toLowerCase() === lower) return value;
      if (value.toLowerCase().replace(/_/g, " ") === lower) return value;
    }
  }

  return null;
}

export function parseDelimitedList(raw: string): string[] {
  return raw
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeListValues(
  raw: string,
  allowedValues?: readonly string[],
  labels?: Record<string, string>,
): string[] {
  const parts = parseDelimitedList(raw);
  if (!allowedValues || allowedValues.length === 0) return parts;

  return parts
    .map((part) => normalizeEnumValue(part, allowedValues, labels))
    .filter((value): value is string => Boolean(value));
}
