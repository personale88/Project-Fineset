import type { StoreCategory } from "@/types";

export const STORE_CATEGORY_LABELS: Record<StoreCategory, string> = {
  JEWELRY: "Jewelry",
  HANDBAGS: "Handbags",
  WATCHES: "Watches",
  OTHER: "Other",
};

export function getStoreCategoryLabel(
  category: StoreCategory,
  customCategory?: string | null,
  labelOverrides?: ReadonlyMap<string, string>,
): string {
  const key = category === "OTHER" && customCategory?.trim() ? customCategory.trim() : category;
  const override = labelOverrides?.get(key);
  if (override) return override;

  if (category === "OTHER" && customCategory) {
    return customCategory;
  }

  return STORE_CATEGORY_LABELS[category] ?? category;
}
