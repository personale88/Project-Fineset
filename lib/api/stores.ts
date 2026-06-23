import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { CreateStoreInput, UpdateStoreInput } from "@/lib/validations/store.schema";
import type { SoftDeleteStoreInput } from "@/lib/validations/store-delete.schema";
import type { RestoreStoreInput } from "@/lib/validations/store-restore.schema";
import type { UpdateStoreManagerPasswordInput } from "@/lib/validations/store-password.schema";
import type { PaginatedResponse, StoreCategory } from "@/types";
import type { CreateStoreResult } from "@/lib/services/stores";

export interface StoreDetail {
  id: string;
  name: string;
  category: StoreCategory;
  customCategory: string | null;
  city: string;
  state: string;
  pincode: string | null;
  businessOwnerName: string | null;
  businessOwnerEmail: string | null;
  isActive: boolean;
  deletedAt: string | null;
  purgeAt: string | null;
  dataExpiryAt: string | null;
  renewalDueAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    staff: number;
    visits: number;
    customers: number;
  };
}

export interface SoftDeleteStoreResult {
  id: string;
  name: string;
  deletedAt: string;
  purgeAt: string;
}

interface StoreListItem {
  id: string;
  name: string;
  category: StoreCategory;
  customCategory: string | null;
  city: string;
  state: string;
  pincode: string | null;
  businessOwnerName: string | null;
  businessOwnerEmail: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  purgeAt?: string | null;
  staffCount: number;
  visits: number;
  revenue: number;
  conversionRate: number;
  createdAt: string;
  dataExpiryAt?: string | null;
  renewalDueAt?: string | null;
}

interface GetStoresParams {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
  includeDeleted?: boolean;
}

export async function getStores(
  params: GetStoresParams = {},
): Promise<PaginatedResponse<StoreListItem>> {
  const qs = buildQueryString(params);
  return apiFetch<PaginatedResponse<StoreListItem>>(`/api/stores${qs}`);
}

export async function getManagerLoginStatus(
  email: string,
): Promise<{ hasExistingLogin: boolean }> {
  const qs = buildQueryString({ email: email.trim().toLowerCase() });
  return apiFetch<{ hasExistingLogin: boolean }>(
    `/api/stores/manager-login-status${qs}`,
  );
}

export async function createStore(payload: CreateStoreInput): Promise<CreateStoreResult> {
  return apiFetch<CreateStoreResult>("/api/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getStoreById(storeId: string): Promise<StoreDetail> {
  return apiFetch<StoreDetail>(`/api/stores/${storeId}`);
}

export async function updateStore(
  storeId: string,
  payload: UpdateStoreInput,
): Promise<StoreDetail> {
  return apiFetch<StoreDetail>(`/api/stores/${storeId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStore(
  storeId: string,
  payload: SoftDeleteStoreInput,
): Promise<SoftDeleteStoreResult> {
  return apiFetch<SoftDeleteStoreResult>(`/api/stores/${storeId}`, {
    method: "DELETE",
    body: JSON.stringify(payload),
  });
}

export async function restoreStore(
  storeId: string,
  payload: RestoreStoreInput,
): Promise<StoreDetail> {
  return apiFetch<StoreDetail>(`/api/stores/${storeId}/restore`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStoreManagerPassword(
  storeId: string,
  payload: UpdateStoreManagerPasswordInput,
): Promise<{ appUserId: string; email: string }> {
  return apiFetch<{ appUserId: string; email: string }>(
    `/api/stores/${storeId}/password`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
