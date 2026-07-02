export interface ResolvedLocationAddress {
  building: string | null;
  street: string | null;
  area: string | null;
  locality: string | null;
  district: string | null;
  state: string | null;
  postalCode: string | null;
  formatted: string;
}

function joinUniqueParts(parts: Array<string | undefined | null>): string | null {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const part of parts) {
    const trimmed = part?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(trimmed);
  }
  return values.length > 0 ? values.join(", ") : null;
}

export function parseNominatimAddress(payload: {
  address?: Record<string, string>;
  display_name?: string;
}): ResolvedLocationAddress {
  const address = payload.address ?? {};

  const building =
    joinUniqueParts([address.house_number, address.building, address.house_name]) || null;

  const street =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.residential ||
    address.street ||
    null;

  const locality = address.neighbourhood || address.hamlet || null;

  const area = joinUniqueParts([
    address.quarter,
    address.suburb,
    address.locality,
    address.village,
  ]);

  const district = joinUniqueParts([
    address.state_district,
    address.city,
    address.city_district,
    address.town,
    address.municipality,
    address.county,
    address.district,
  ]);

  const state = address.state || null;
  const postalCode = address.postcode || null;

  const parts = [building, street, locality, area, district, state, postalCode].filter(
    (part): part is string => Boolean(part?.trim()),
  );

  const formatted = payload.display_name?.trim() || parts.join(", ");

  return {
    building,
    street,
    area,
    locality,
    district,
    state,
    postalCode,
    formatted: formatted.slice(0, 500),
  };
}

export function formatResolvedLocationAddress(address: ResolvedLocationAddress): string {
  return address.formatted;
}
