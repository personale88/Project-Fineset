"use client";

import { useEffect, useState } from "react";
import type { ResolvedLocationAddress } from "@/lib/field-force/parse-nominatim-address";

export function useLocationAddress(latitude: number | null, longitude: number | null) {
  const [address, setAddress] = useState<ResolvedLocationAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    void (async () => {
      setIsLoading(true);
      setError(null);

      const url = new URL("/api/field-force/reverse-geocode", window.location.origin);
      url.searchParams.set("latitude", String(latitude));
      url.searchParams.set("longitude", String(longitude));

      try {
        const response = await fetch(url.toString(), {
          signal: controller.signal,
          credentials: "include",
        });
        if (!active) return;

        if (!response.ok) {
          setAddress(null);
          setError("Address lookup failed");
          return;
        }

        const payload = (await response.json()) as { address?: ResolvedLocationAddress };
        setAddress(payload.address ?? null);
        setError(null);
      } catch (fetchError: unknown) {
        if (!active || controller.signal.aborted) return;
        setAddress(null);
        setError(fetchError instanceof Error ? fetchError.message : "Address lookup failed");
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
      controller.abort();
    };
  }, [latitude, longitude]);

  return {
    address: latitude != null && longitude != null ? address : null,
    isLoading: latitude != null && longitude != null ? isLoading : false,
    error: latitude != null && longitude != null ? error : null,
  };
}
