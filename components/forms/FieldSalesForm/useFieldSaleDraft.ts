"use client";

import { useEffect } from "react";
import type { UseFormReset, UseFormWatch } from "react-hook-form";
import type { FieldSalesFormValues } from "./FieldSalesForm.types";

const FIELD_SALE_DRAFT_STORAGE_KEY = "fineset-field-sale-draft";

export function loadFieldSaleDraft(): Partial<FieldSalesFormValues> | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = localStorage.getItem(FIELD_SALE_DRAFT_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<FieldSalesFormValues>;
    return parsed;
  } catch {
    return undefined;
  }
}

export function saveFieldSaleDraft(values: FieldSalesFormValues): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIELD_SALE_DRAFT_STORAGE_KEY, JSON.stringify(values));
}

export function clearFieldSaleDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FIELD_SALE_DRAFT_STORAGE_KEY);
}

export function useFieldSaleDraft(
  watch: UseFormWatch<FieldSalesFormValues>,
  reset: UseFormReset<FieldSalesFormValues>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const draft = loadFieldSaleDraft();
    if (draft) {
      reset({ ...watch(), ...draft });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const subscription = watch((values) => {
      saveFieldSaleDraft(values as FieldSalesFormValues);
    });
    return () => subscription.unsubscribe();
  }, [enabled, watch]);
}
