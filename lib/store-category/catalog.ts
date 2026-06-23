import type { StoreCategory } from "@prisma/client";
import { STORE_CATEGORY_LABELS } from "@/lib/utils/store-category";

export const BUILTIN_STORE_CATEGORIES = [
  "JEWELRY",
  "HANDBAGS",
  "WATCHES",
  "OTHER",
] as const satisfies readonly StoreCategory[];

export function isBuiltinStoreCategoryKey(name: string): boolean {
  return BUILTIN_STORE_CATEGORIES.includes(name.toUpperCase() as StoreCategory);
}

export interface StoreCategoryChoice {
  /** Unique key used in dropdowns — enum value or custom category name. */
  name: string;
  label: string;
  isBuiltin: boolean;
  storeCount: number;
  hiddenFromPicker?: boolean;
}

export interface StoreCategoryFormValue {
  category: StoreCategory;
  customCategory: string | null;
}

export function storeCategoryChoiceToFormValue(name: string): StoreCategoryFormValue {
  if (isBuiltinStoreCategoryKey(name)) {
    return {
      category: name.toUpperCase() as StoreCategory,
      customCategory: null,
    };
  }

  return {
    category: "OTHER",
    customCategory: name,
  };
}

export function storeCategoryFormValueToChoice(input: {
  category: StoreCategory;
  customCategory?: string | null;
}): string {
  if (input.category === "OTHER" && input.customCategory?.trim()) {
    return input.customCategory.trim();
  }

  return input.category;
}

export function defaultBuiltinLabel(category: StoreCategory): string {
  return STORE_CATEGORY_LABELS[category];
}
