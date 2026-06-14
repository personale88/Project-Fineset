import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { CreateVisitInput } from "@/lib/validations/visit.schema";
import type { GetVisitsParams, PaginatedResponse, VisitListItem } from "@/types";
import type { Visit } from "@prisma/client";

export interface VisitsImportError {
  row: number;
  message: string;
}

export interface VisitsImportResult {
  createdCount: number;
  failedCount: number;
  errors: VisitsImportError[];
}

export async function createVisit(payload: CreateVisitInput): Promise<Visit> {
  return apiFetch<Visit>("/api/visits", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getVisits(
  params: GetVisitsParams = {},
): Promise<PaginatedResponse<VisitListItem>> {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedResponse<VisitListItem>>(`/api/visits${qs}`);
}

export async function importVisitsCsv(
  file: File,
  storeId?: string,
): Promise<VisitsImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const res = await fetch(`/api/visits/import${qs}`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  const body = (await res.json()) as
    | VisitsImportResult
    | { message?: string; errors?: VisitsImportError[] };

  if (!res.ok) {
    throw new Error(
      "message" in body && body.message ? body.message : "CSV import failed",
    );
  }

  return body as VisitsImportResult;
}
