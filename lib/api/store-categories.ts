import { apiFetch } from "@/lib/api/client";
import type { StoreCategoryChoice } from "@/lib/store-category/catalog";

export async function fetchStoreCategoryChoices(): Promise<StoreCategoryChoice[]> {
  const payload = await apiFetch<{ choices: StoreCategoryChoice[] }>("/api/store-categories");
  return payload.choices;
}
