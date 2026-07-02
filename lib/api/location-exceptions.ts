import { apiFetch } from "@/lib/api/client";

export interface LocationCaptureExceptionDto {
  id: string;
  storeId: string;
  staffId: string;
  recordType: "FIELD_SALE" | "VISIT";
  reason: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface CreateLocationExceptionInput {
  staffId: string;
  recordType: "FIELD_SALE" | "VISIT";
  reason?: string;
}

export async function getActiveLocationException(
  recordType: "FIELD_SALE" | "VISIT",
): Promise<LocationCaptureExceptionDto | null> {
  const qs = new URLSearchParams({ recordType });
  return apiFetch<LocationCaptureExceptionDto | null>(
    `/api/location-exceptions/active?${qs.toString()}`,
  );
}

export async function createLocationException(
  payload: CreateLocationExceptionInput,
): Promise<LocationCaptureExceptionDto> {
  return apiFetch<LocationCaptureExceptionDto>("/api/location-exceptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
