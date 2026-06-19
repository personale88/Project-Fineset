import { apiFetch, buildQueryString } from "@/lib/api/client";

export interface CorrectionRequestItem {
  id: string;
  message: string;
  createdAt: string;
  staff: { id: string; name: string };
  visit: { id: string; customerName: string } | null;
  fieldSale: { id: string; customerName: string } | null;
}

export async function listCorrectionRequests(
  storeId: string,
): Promise<CorrectionRequestItem[]> {
  const response = await apiFetch<{ data: CorrectionRequestItem[] }>(
    `/api/dashboard/correction-requests${buildQueryString({ storeId })}`,
  );
  return response.data;
}

export async function resolveCorrectionRequest(
  storeId: string,
  id: string,
): Promise<void> {
  await apiFetch(`/api/dashboard/correction-requests${buildQueryString({ storeId, id })}`, {
    method: "PATCH",
  });
}
