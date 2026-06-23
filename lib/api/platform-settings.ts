import { apiFetch } from "@/lib/api/client";
import type {
  PlatformSettingsResponse,
  StoreCategoryOptionDto,
} from "@/lib/platform/types";
import type { PlatformSettingsPatchInput } from "@/lib/platform/settings-schema";

export async function fetchPlatformSettings(): Promise<PlatformSettingsResponse> {
  return apiFetch<PlatformSettingsResponse>("/api/admin/settings");
}

export async function updatePlatformSettings(
  patch: PlatformSettingsPatchInput,
): Promise<PlatformSettingsResponse> {
  return apiFetch<PlatformSettingsResponse>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function fetchStoreCategories(): Promise<StoreCategoryOptionDto[]> {
  const payload = await apiFetch<{ categories: StoreCategoryOptionDto[] }>(
    "/api/admin/settings/categories",
  );
  return payload.categories;
}

export async function createStoreCategory(name: string): Promise<StoreCategoryOptionDto> {
  const payload = await apiFetch<{ category: StoreCategoryOptionDto }>(
    "/api/admin/settings/categories",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  return payload.category;
}

export async function updateStoreCategory(
  input: { name: string; label?: string; newName?: string },
): Promise<StoreCategoryOptionDto> {
  const payload = await apiFetch<{ category: StoreCategoryOptionDto }>(
    "/api/admin/settings/categories",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return payload.category;
}

export async function deleteStoreCategory(name: string): Promise<void> {
  await apiFetch("/api/admin/settings/categories", {
    method: "DELETE",
    body: JSON.stringify({ name }),
  });
}

export async function restoreStoreCategory(name: string): Promise<StoreCategoryOptionDto> {
  const payload = await apiFetch<{ category: StoreCategoryOptionDto }>(
    "/api/admin/settings/categories/restore",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
  );
  return payload.category;
}
