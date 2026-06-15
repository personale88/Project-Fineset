import { apiFetch } from "@/lib/api/client";
import type { AssignCustomerInput } from "@/lib/validations/customer-assignment.schema";
import type { AssignCustomerResult } from "@/lib/services/customer-assignment";

export async function assignCustomer(
  payload: AssignCustomerInput,
  storeId?: string,
): Promise<AssignCustomerResult> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return apiFetch<AssignCustomerResult>(`/api/assignments${qs}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
