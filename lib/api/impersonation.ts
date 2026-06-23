import { apiFetch } from "@/lib/api/client";

export interface ImpersonationResult {
  ok: boolean;
  storeId?: string;
  storeName?: string;
}

export async function setAdminImpersonation(storeId: string | null): Promise<ImpersonationResult> {
  return apiFetch<ImpersonationResult>("/api/admin/impersonate", {
    method: "POST",
    body: JSON.stringify({ storeId }),
  });
}
