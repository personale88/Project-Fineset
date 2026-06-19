import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { CustomerProfile } from "@/lib/services/customer-profile";
import type { CustomerLookupResult } from "@/lib/services/customers";
import { ApiError } from "@/types";

export async function getCustomerProfile(params: {
  customerId?: string;
  visitId?: string;
  fieldSaleId?: string;
  storeId?: string;
}): Promise<CustomerProfile> {
  const qs = buildQueryString(params);
  return apiFetch<CustomerProfile>(`/api/customers/profile${qs}`);
}

export async function lookupCustomerByPhone(
  phone: string,
): Promise<CustomerLookupResult | null> {
  try {
    const qs = buildQueryString({ phone });
    return await apiFetch<CustomerLookupResult>(`/api/customers/lookup${qs}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function mergeCustomers(payload: {
  sourceCustomerId: string;
  targetCustomerId: string;
  storeId?: string;
}): Promise<{ mergedInto: string }> {
  const qs = payload.storeId
    ? buildQueryString({ storeId: payload.storeId })
    : "";
  return apiFetch(`/api/customers/merge${qs}`, {
    method: "POST",
    body: JSON.stringify({
      sourceCustomerId: payload.sourceCustomerId,
      targetCustomerId: payload.targetCustomerId,
    }),
  });
}
