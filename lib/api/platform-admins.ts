import { apiFetch } from "@/lib/api/client";
import type {
  PlatformAdminInviteInput,
  PlatformAdminInviteResult,
  PlatformAdminRow,
  PlatformAdminUpdateInput,
} from "@/lib/validations/platform-admin.schema";

export async function fetchPlatformAdmins(): Promise<PlatformAdminRow[]> {
  return apiFetch<PlatformAdminRow[]>("/api/admin/team");
}

export async function invitePlatformAdmin(
  payload: PlatformAdminInviteInput,
): Promise<PlatformAdminInviteResult> {
  return apiFetch<PlatformAdminInviteResult>("/api/admin/team", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePlatformAdmin(
  userId: string,
  payload: PlatformAdminUpdateInput,
): Promise<PlatformAdminRow> {
  return apiFetch<PlatformAdminRow>(`/api/admin/team/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
