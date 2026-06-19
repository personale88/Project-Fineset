import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { UpdateFollowUpInput } from "@/lib/validations/follow-ups.schema";
import type { FollowUpListItem } from "@/types";

export async function updateFollowUp(
  followUpId: string,
  payload: UpdateFollowUpInput,
  storeId?: string,
): Promise<FollowUpListItem> {
  const qs = buildQueryString({ storeId });
  return apiFetch<FollowUpListItem>(`/api/follow-ups/${followUpId}${qs}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
