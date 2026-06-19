import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { StaffWorkQueueResponse } from "@/types/staff-work-queue";
import type {
  StaffAmendFieldSaleInput,
  StaffAmendVisitInput,
  StaffCorrectionRequestInput,
} from "@/lib/validations/staff-amend.schema";
import type { FieldSaleListItem, VisitListItem } from "@/types";

export interface StaffDigestResponse {
  overdue: number;
  dueToday: number;
  total: number;
  topNames: string[];
}

export async function getStaffWorkQueue(limit = 15): Promise<StaffWorkQueueResponse> {
  return apiFetch<StaffWorkQueueResponse>(
    `/api/staff/work-queue${buildQueryString({ limit })}`,
  );
}

export async function getStaffDigest(): Promise<StaffDigestResponse> {
  return apiFetch<StaffDigestResponse>("/api/staff/digest");
}

export async function amendStaffVisit(
  visitId: string,
  data: StaffAmendVisitInput,
): Promise<VisitListItem> {
  return apiFetch<VisitListItem>(`/api/visits/${visitId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function amendStaffFieldSale(
  fieldSaleId: string,
  data: StaffAmendFieldSaleInput,
): Promise<FieldSaleListItem & { createdAt: string }> {
  return apiFetch<FieldSaleListItem & { createdAt: string }>(
    `/api/field-sales/${fieldSaleId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function submitCorrectionRequest(
  data: StaffCorrectionRequestInput,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/api/staff/correction-requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
