import { apiFetch } from "@/lib/api/client";
import type { CreateStaffInput, UpdateStaffInput } from "@/lib/validations/staff.schema";
import type { StaffPerformanceRow } from "@/types";

interface InviteStaffResponse {
  appUserId: string;
  email: string;
  role: string;
}

interface StaffListItem {
  id: string;
  name: string;
  employeeId: string;
  phone: string | null;
  role: "STAFF" | "STORE_MANAGER" | "MASTER_ADMIN";
  email: string | null;
  createdAt: Date | string;
  isActive: boolean;
  visitCount: number;
  canDelete: boolean;
  monthlyRevenue: number;
  conversionRate: number;
  openFollowUps: number;
}

export async function getStaff(storeId?: string): Promise<StaffListItem[]> {
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return apiFetch<StaffListItem[]>(`/api/staff${qs}`);
}

function staffStoreQuery(storeId?: string): string {
  return storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
}

export async function createStaff(
  payload: CreateStaffInput,
  storeId?: string,
): Promise<InviteStaffResponse> {
  return apiFetch<InviteStaffResponse>(`/api/staff${staffStoreQuery(storeId)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaff(
  staffId: string,
  payload: UpdateStaffInput,
  storeId?: string,
): Promise<{ count: number }> {
  return apiFetch<{ count: number }>(
    `/api/staff/${staffId}${staffStoreQuery(storeId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteStaff(staffId: string, storeId?: string): Promise<void> {
  await apiFetch<void>(`/api/staff/${staffId}${staffStoreQuery(storeId)}`, {
    method: "DELETE",
  });
}

export async function getStaffPerformance(
  storeId?: string,
): Promise<StaffPerformanceRow[]> {
  const qs = storeId ? `?storeId=${storeId}` : "";
  return apiFetch<StaffPerformanceRow[]>(`/api/staff/performance${qs}`);
}

export async function importStaffCsv(
  file: File,
  storeId?: string,
): Promise<{ createdCount: number; failedCount: number; errors: Array<{ row: number; message: string }> }> {
  const formData = new FormData();
  formData.append("file", file);
  const qs = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  return apiFetch(`/api/staff/import${qs}`, {
    method: "POST",
    body: formData,
  });
}
