import { apiFetch, buildQueryString } from "@/lib/api/client";

export async function bulkAssignFollowUps(
  storeId: string,
  payload: { targetStaffId: string; followUpIds: string[] },
): Promise<{ assigned: number; skipped: number }> {
  return apiFetch(`/api/assignments/bulk${buildQueryString({ storeId })}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
