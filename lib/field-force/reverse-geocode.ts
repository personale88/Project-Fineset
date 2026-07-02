import {
  formatResolvedLocationAddress,
  parseNominatimAddress,
  type ResolvedLocationAddress,
} from "@/lib/field-force/parse-nominatim-address";

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "FineSet-FieldForce/1.0 (location verification)";

export type { ResolvedLocationAddress };

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
): Promise<ResolvedLocationAddress | null> {
  try {
    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };

    const parsed = parseNominatimAddress(payload);
    if (!parsed.formatted) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Stored on FieldSale.locationAddress */
export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const resolved = await reverseGeocodeLocation(latitude, longitude);
  if (!resolved) return null;
  return formatResolvedLocationAddress(resolved);
}
