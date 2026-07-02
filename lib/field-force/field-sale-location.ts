import type { PlatformSettingsFieldForce } from "@/lib/platform/types";

/** Fixed field-sale GPS rules — browser geolocation only, not configurable in admin. */
export const FIELD_SALE_GPS_MAX_ACCURACY_METERS = 50;

export const FIELD_SALE_LOCATION_SETTINGS: PlatformSettingsFieldForce = {
  requireGpsForFieldSales: true,
  requireGpsForVisits: true,
  maxAccuracyMeters: FIELD_SALE_GPS_MAX_ACCURACY_METERS,
  allowSubmitWithoutGps: false,
  maxLocationAgeSeconds: 120,
};
